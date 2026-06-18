import { describe, it, expect, vi, beforeAll, afterEach } from "vitest";
import { writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { buildProgram } from "../src/cli-core.js";
import { registerAdapter } from "../src/providers/registry.js";

beforeAll(() => {
  registerAdapter({
    name: "clitstub",
    async generate() {
      return { text: "Hello Kunal", raw: null, model: "m", provider: "clitstub" };
    },
  });
});

const PROMPT = `---
model: m
provider: clitstub
input:
  name: string
tests:
  - name: renders greeting
    input: { name: Kunal }
    assert:
      - rendered_contains: "Hi"
  - name: live check
    input: { name: Kunal }
    assert:
      - response_contains: "Hello"
---
<user>
Hi {{name}}
</user>
`;

async function tmpPrompt(body: string): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "promptfile-test-"));
  const file = join(dir, "g.prompt");
  await writeFile(file, body, "utf8");
  return file;
}

afterEach(() => vi.restoreAllMocks());

describe("promptfile test command", () => {
  it("runs render tests, skips live tests without a key, exits 0", async () => {
    const file = await tmpPrompt(PROMPT);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const prevExit = process.exitCode;
    await buildProgram().parseAsync(["node", "promptfile", "test", file]);
    const out = log.mock.calls.map((c) => c[0]).join("\n");
    expect(out).toContain("✓ renders greeting");
    expect(out).toContain("1 passed, 0 failed, 1 skipped");
    expect(process.exitCode === undefined || process.exitCode === 0).toBe(true);
    process.exitCode = prevExit;
  });

  it("exits 1 when a render test fails", async () => {
    const failing = PROMPT.replace('rendered_contains: "Hi"', 'rendered_contains: "Nope"');
    const file = await tmpPrompt(failing);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const prevExit = process.exitCode;
    await buildProgram().parseAsync(["node", "promptfile", "test", file, "--render-only"]);
    expect(process.exitCode).toBe(1);
    process.exitCode = prevExit;
    void log;
  });
});
