import { describe, it, expect, beforeAll, vi } from "vitest";
import { parsePrompt } from "../src/prompt.js";
import { registerAdapter } from "../src/providers/registry.js";
import { ProviderError } from "../src/errors.js";

const genStructured = vi.fn();
const genPlain = vi.fn();

beforeAll(() => {
  registerAdapter({
    name: "nativestub",
    async generate(...args) {
      genPlain(...args);
      return { text: '{"title":"injected"}', raw: null, model: "m", provider: "nativestub" };
    },
    async generateStructured(messages, config, jsonSchema) {
      genStructured(jsonSchema);
      return { text: '{"title":"native"}', raw: null, model: "m", provider: "nativestub" };
    },
  });
  registerAdapter({
    name: "plainstub",
    async generate() {
      return { text: '{"title":"plain"}', raw: null, model: "m", provider: "plainstub" };
    },
  });
});

function prompt(provider: string) {
  return parsePrompt(`---\nmodel: m\nprovider: ${provider}\noutput:\n  title: string\n---\n<user>Go</user>\n`);
}

describe("run() native structured output", () => {
  it("auto mode uses native when supported (and passes JSON Schema)", async () => {
    genStructured.mockClear();
    const r = await prompt("nativestub").run({});
    expect(r.data).toEqual({ title: "native" });
    expect(genStructured).toHaveBeenCalledOnce();
    expect(genStructured.mock.calls[0][0]).toMatchObject({ type: "object", properties: { title: { type: "string" } } });
  });

  it("auto mode falls back to prompt injection when unsupported", async () => {
    const r = await prompt("plainstub").run({});
    expect(r.data).toEqual({ title: "plain" });
  });

  it("outputMode 'prompt' forces injection even when native is available", async () => {
    genStructured.mockClear();
    genPlain.mockClear();
    const r = await prompt("nativestub").run({}, { outputMode: "prompt" });
    expect(r.data).toEqual({ title: "injected" });
    expect(genStructured).not.toHaveBeenCalled();
    expect(genPlain).toHaveBeenCalledOnce();
  });

  it("outputMode 'native' throws when unsupported", async () => {
    await expect(prompt("plainstub").run({}, { outputMode: "native" })).rejects.toBeInstanceOf(ProviderError);
  });
});
