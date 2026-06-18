import { describe, it, expect, beforeAll } from "vitest";
import { parsePrompt } from "../src/prompt.js";
import { registerAdapter } from "../src/providers/registry.js";

beforeAll(() => {
  registerAdapter({
    name: "streamstub",
    async generate() {
      return { text: '{"title":"Hello"}', raw: null, model: "m", provider: "streamstub" };
    },
    async *generateStream() {
      yield '{"tit';
      yield 'le":"Hel';
      yield 'lo"}';
    },
  });
  registerAdapter({
    name: "nostream",
    async generate() {
      return { text: '{"title":"Once"}', raw: null, model: "m", provider: "nostream" };
    },
  });
});

function prompt(provider: string) {
  return parsePrompt(
    `---\nmodel: m\nprovider: ${provider}\noutput:\n  title: string\n---\n<user>\nGo\n</user>\n`
  );
}

describe("prompt.stream()", () => {
  it("streams partial objects and resolves validated complete", async () => {
    const stream = prompt("streamstub").stream({});
    const seen: unknown[] = [];
    for await (const partial of stream) seen.push(partial);
    expect(seen[seen.length - 1]).toEqual({ title: "Hello" });
    const result = await stream.complete;
    expect(result.data).toEqual({ title: "Hello" });
  });

  it("falls back to a single chunk when the adapter has no generateStream", async () => {
    const stream = prompt("nostream").stream({});
    const seen: unknown[] = [];
    for await (const partial of stream) seen.push(partial);
    expect(seen).toEqual([{ title: "Once" }]);
    expect((await stream.complete).data).toEqual({ title: "Once" });
  });
});
