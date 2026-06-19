import { describe, it, expect, vi, afterEach } from "vitest";
import { anthropicAdapter } from "../../src/providers/anthropic.js";
import type { Message, PromptConfig } from "../../src/types.js";

const messages: Message[] = [
  { role: "system", content: "Be precise." },
  { role: "user", content: "Hi" },
];
const config: PromptConfig = { model: "claude-opus-4-8", provider: "anthropic", params: {} };
const jsonSchema = { type: "object", properties: { title: { type: "string" } }, required: ["title"], additionalProperties: false };

afterEach(() => vi.unstubAllGlobals());

describe("anthropicAdapter.generateStructured", () => {
  it("forces a single output tool and returns its input as JSON", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: "tool_use", name: "output", input: { title: "Hi" } }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await anthropicAdapter.generateStructured!(messages, config, jsonSchema, { apiKey: "x" });
    expect(result.text).toBe('{"title":"Hi"}');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.tools).toEqual([
      { name: "output", description: "Return the structured output.", input_schema: jsonSchema },
    ]);
    expect(body.tool_choice).toEqual({ type: "tool", name: "output" });
    expect(body.system).toBe("Be precise.");
  });
});
