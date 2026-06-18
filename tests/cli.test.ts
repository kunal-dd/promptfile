import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { collectVar, coerceInputs, buildProgram } from "../src/cli-core.js";
import { registerAdapter } from "../src/providers/registry.js";
import type { InputSpec } from "../src/types.js";

const SPECS: InputSpec[] = [
  { name: "name", type: "string", required: true },
  { name: "count", type: "number", required: true },
  { name: "flag", type: "boolean", required: false },
];

beforeAll(() => {
  registerAdapter({
    name: "clistub",
    async generate(messages) {
      return { text: `RAN:${messages[0]!.content}`, raw: null, model: "m", provider: "clistub" };
    },
  });
});

afterEach(() => vi.restoreAllMocks());

describe("collectVar", () => {
  it("accumulates key=value pairs", () => {
    expect(collectVar("b=2", collectVar("a=1", {}))).toEqual({ a: "1", b: "2" });
  });
  it("throws without an = sign", () => {
    expect(() => collectVar("bad", {})).toThrow(/key=value/);
  });
});

describe("coerceInputs", () => {
  it("coerces numbers and booleans per spec, leaves strings", () => {
    expect(coerceInputs(SPECS, { name: "Kunal", count: "3", flag: "true" }))
      .toEqual({ name: "Kunal", count: 3, flag: true });
  });
  it("throws on a non-numeric number input", () => {
    expect(() => coerceInputs(SPECS, { count: "x" })).toThrow(/must be a number/);
  });
});

describe("buildProgram render/run", () => {
  async function tmpPrompt(): Promise<string> {
    const dir = await mkdtemp(join(tmpdir(), "promptfile-cli-"));
    const file = join(dir, "g.prompt");
    await writeFile(
      file,
      `---\nmodel: m\nprovider: clistub\ninput:\n  name: string\n---\n<user>\nHi {{name}}\n</user>\n`,
      "utf8"
    );
    return file;
  }

  it("render prints the messages JSON", async () => {
    const file = await tmpPrompt();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await buildProgram().parseAsync(["node", "promptfile", "render", file, "--var", "name=Kunal"]);
    expect(log.mock.calls[0][0]).toContain('"content": "Hi Kunal"');
  });

  it("run prints the provider text", async () => {
    const file = await tmpPrompt();
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await buildProgram().parseAsync(["node", "promptfile", "run", file, "--var", "name=Kunal"]);
    expect(log.mock.calls[0][0]).toBe("RAN:Hi Kunal");
  });
});
