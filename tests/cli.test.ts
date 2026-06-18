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
  it("accepts false/0 as boolean false", () => {
    expect(coerceInputs(SPECS, { flag: "false" })).toEqual({ flag: false });
    expect(coerceInputs(SPECS, { flag: "0" })).toEqual({ flag: false });
  });
  it("throws on an invalid boolean instead of silently defaulting to false", () => {
    expect(() => coerceInputs(SPECS, { flag: "yes" })).toThrow(/must be a boolean/);
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

  it("coerces string values from a --vars-file per the input schema", async () => {
    const dir = await mkdtemp(join(tmpdir(), "promptfile-cli-"));
    const file = join(dir, "n.prompt");
    await writeFile(
      file,
      `---\nmodel: m\nprovider: clistub\ninput:\n  count: number\n---\n<user>\nn={{count}}\n</user>\n`,
      "utf8"
    );
    const varsFile = join(dir, "vars.json");
    await writeFile(varsFile, JSON.stringify({ count: "5" }), "utf8"); // count as a string
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    // Without coercion the string "5" would fail number validation; a clean render proves coercion ran.
    await buildProgram().parseAsync(["node", "promptfile", "render", file, "--vars-file", varsFile]);
    expect(log.mock.calls[0][0]).toContain('"content": "n=5"');
  });

  it("lets --var override a --vars-file value", async () => {
    const dir = await mkdtemp(join(tmpdir(), "promptfile-cli-"));
    const file = join(dir, "g.prompt");
    await writeFile(
      file,
      `---\nmodel: m\nprovider: clistub\ninput:\n  name: string\n---\n<user>\nHi {{name}}\n</user>\n`,
      "utf8"
    );
    const varsFile = join(dir, "vars.json");
    await writeFile(varsFile, JSON.stringify({ name: "FromFile" }), "utf8");
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await buildProgram().parseAsync([
      "node", "promptfile", "render", file, "--vars-file", varsFile, "--var", "name=Override",
    ]);
    expect(log.mock.calls[0][0]).toContain('"content": "Hi Override"');
  });
});
