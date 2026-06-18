import { describe, it, expect, beforeAll } from "vitest";
import { parsePrompt } from "../src/prompt.js";
import { registerAdapter } from "../src/providers/registry.js";
import { OutputValidationError } from "../src/errors.js";

let scripted: string[] = [];
let calls = 0;

beforeAll(() => {
  registerAdapter({
    name: "structstub",
    async generate() {
      const text = scripted[Math.min(calls, scripted.length - 1)]!;
      calls++;
      return { text, raw: { i: calls }, model: "m", provider: "structstub" };
    },
  });
});

function prompt(outputYaml: string) {
  return parsePrompt(
    `---\nmodel: m\nprovider: structstub\n${outputYaml}---\n<user>\nGo\n</user>\n`
  );
}

describe("run() with output schema", () => {
  it("returns validated data alongside raw text", async () => {
    calls = 0;
    scripted = ['{"title":"Hello"}'];
    const p = prompt("output:\n  title: string\n");
    const r = await p.run({});
    expect(r.data).toEqual({ title: "Hello" });
    expect(r.text).toBe('{"title":"Hello"}');
  });

  it("repairs an invalid first response via one re-ask", async () => {
    calls = 0;
    scripted = ['{"title":123}', '{"title":"Fixed"}'];
    const p = prompt("output:\n  title: string\n");
    const r = await p.run({});
    expect(r.data).toEqual({ title: "Fixed" });
    expect(calls).toBe(2);
  });

  it("throws OutputValidationError when repair is disabled and output is invalid", async () => {
    calls = 0;
    scripted = ['{"title":123}'];
    const p = prompt("output:\n  title: string\n");
    await expect(p.run({}, { repair: 0 })).rejects.toBeInstanceOf(OutputValidationError);
  });

  it("leaves data undefined when there is no output schema", async () => {
    calls = 0;
    scripted = ["just text"];
    const p = prompt("");
    const r = await p.run({});
    expect(r.data).toBeUndefined();
    expect(r.text).toBe("just text");
  });
});
