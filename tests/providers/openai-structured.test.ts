import { describe, it, expect, vi, afterEach } from "vitest";
import { openaiAdapter } from "../../src/providers/openai.js";
import { ProviderError } from "../../src/errors.js";
import type { Message, PromptConfig } from "../../src/types.js";

const messages: Message[] = [{ role: "user", content: "Hi" }];
const config: PromptConfig = { model: "gpt-4o", provider: "openai", params: {} };
const jsonSchema = { type: "object", properties: { title: { type: "string" } }, required: ["title"], additionalProperties: false };

afterEach(() => vi.unstubAllGlobals());

describe("openaiAdapter.generateStructured", () => {
  it("sends response_format json_schema and returns the content", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: '{"title":"Hi"}' } }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await openaiAdapter.generateStructured!(messages, config, jsonSchema, { apiKey: "x" });
    expect(result.text).toBe('{"title":"Hi"}');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.response_format).toEqual({
      type: "json_schema",
      json_schema: { name: "output", schema: jsonSchema, strict: false },
    });
  });

  it("throws ProviderError without a key", async () => {
    const prev = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    await expect(openaiAdapter.generateStructured!(messages, config, jsonSchema, {})).rejects.toThrow(ProviderError);
    if (prev !== undefined) process.env.OPENAI_API_KEY = prev;
  });
});
