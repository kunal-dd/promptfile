import { describe, it, expect, beforeAll } from "vitest";
import { parsePrompt } from "../src/prompt.js";
import { registerAdapter } from "../src/providers/registry.js";

interface Article {
  title: string;
}

beforeAll(() => {
  registerAdapter({
    name: "genericstub",
    async generate() {
      return { text: '{"title":"Hi"}', raw: null, model: "m", provider: "genericstub" };
    },
  });
});

function prompt() {
  return parsePrompt(`---\nmodel: m\nprovider: genericstub\noutput:\n  title: string\n---\n<user>Go</user>\n`);
}

describe("generics", () => {
  it("run<T> types data as T (compile-time) and returns it at runtime", async () => {
    const r = await prompt().run<Article>({});
    const data: Article | undefined = r.data;
    expect(data).toEqual({ title: "Hi" });
  });

  it("stream<T> types complete.data as T", async () => {
    const s = prompt().stream<Article>({});
    const result = await s.complete;
    const data: Article = result.data;
    expect(data).toEqual({ title: "Hi" });
  });
});
