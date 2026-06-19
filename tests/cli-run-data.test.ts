import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildProgram } from "../src/cli-core.js";
import { registerAdapter } from "../src/providers/registry.js";

beforeAll(() => {
  registerAdapter({
    name: "clidata",
    async generate() {
      return { text: '{"title":"Hi"}', raw: null, model: "m", provider: "clidata" };
    },
  });
});

afterEach(() => vi.restoreAllMocks());

async function tmpPrompt(body: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "promptfile-data-"));
  const file = join(dir, "g.prompt");
  await writeFile(file, body, "utf8");
  return file;
}

describe("promptfile run with output schema", () => {
  it("prints validated data as pretty JSON", async () => {
    const file = await tmpPrompt(
      `---\nmodel: m\nprovider: clidata\noutput:\n  title: string\n---\n<user>\nGo\n</user>\n`
    );
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await buildProgram().parseAsync(["node", "promptfile", "run", file]);
    expect(log.mock.calls[0][0]).toBe('{\n  "title": "Hi"\n}');
  });
});
