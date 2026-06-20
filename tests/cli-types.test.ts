import { describe, it, expect, vi, afterEach } from "vitest";
import { writeFile, mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildProgram } from "../src/cli-core.js";

afterEach(() => vi.restoreAllMocks());

async function tmpFile(name: string, body: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "promptfile-types-"));
  const file = join(dir, name);
  await writeFile(file, body, "utf8");
  return file;
}

const WITH_OUTPUT = `---\nmodel: m\nprovider: openai\noutput:\n  title: string\n  tags: string[]\n---\n<user>go</user>\n`;
const NO_OUTPUT = `---\nmodel: m\nprovider: openai\n---\n<user>hi</user>\n`;

describe("promptfile types", () => {
  it("prints an interface named from the filename to stdout", async () => {
    const file = await tmpFile("extract.prompt", WITH_OUTPUT);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await buildProgram().parseAsync(["node", "promptfile", "types", file]);
    const out = log.mock.calls.map((c) => c[0]).join("\n");
    expect(out).toContain("export interface Extract {");
    expect(out).toContain("tags: string[];");
  });

  it("writes to -o and skips files without an output schema", async () => {
    const a = await tmpFile("article.prompt", WITH_OUTPUT);
    const b = await tmpFile("plain.prompt", NO_OUTPUT);
    const outFile = join(tmpdir(), `promptfile-types-${Math.abs(a.length)}.ts`);
    vi.spyOn(console, "error").mockImplementation(() => {});
    await buildProgram().parseAsync(["node", "promptfile", "types", a, b, "-o", outFile]);
    const written = await readFile(outFile, "utf8");
    expect(written).toContain("export interface Article {");
    expect(written).not.toContain("Plain");
  });

  it("exits non-zero when no file has an output schema", async () => {
    const b = await tmpFile("plain.prompt", NO_OUTPUT);
    vi.spyOn(console, "error").mockImplementation(() => {});
    const prev = process.exitCode;
    await buildProgram().parseAsync(["node", "promptfile", "types", b]);
    expect(process.exitCode).toBe(1);
    process.exitCode = prev;
  });

  it("produces a valid identifier for a leading-digit filename", async () => {
    const file = await tmpFile("9lives.prompt", WITH_OUTPUT);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    await buildProgram().parseAsync(["node", "promptfile", "types", file]);
    const out = log.mock.calls.map((c) => c[0]).join("\n");
    // must not start the interface name with a digit
    expect(out).toContain("export interface _9Lives {");
  });
});
