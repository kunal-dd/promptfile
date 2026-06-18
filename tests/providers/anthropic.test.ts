import { describe, it, expect, vi, afterEach } from "vitest";
import { anthropicAdapter } from "../../src/providers/anthropic.js";
import { ProviderError } from "../../src/errors.js";
import type { Message, PromptConfig } from "../../src/types.js";

const messages: Message[] = [
  { role: "system", content: "Be nice." },
  { role: "user", content: "Hi" },
];
const config: PromptConfig = { model: "claude-opus-4-8", provider: "anthropic", params: { temperature: 0.5 } };

afterEach(() => vi.unstubAllGlobals());

describe("anthropicAdapter", () => {
  it("posts system separately, returns concatenated text", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ content: [{ type: "text", text: "Hello!" }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await anthropicAdapter.generate(messages, config, { apiKey: "sk-test" });

    expect(result.text).toBe("Hello!");
    expect(result.provider).toBe("anthropic");
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.system).toBe("Be nice.");
    expect(body.messages).toEqual([{ role: "user", content: "Hi" }]);
    expect(body.temperature).toBe(0.5);
    expect(body.max_tokens).toBe(1024);
  });

  it("throws ProviderError when no API key", async () => {
    const prev = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    await expect(anthropicAdapter.generate(messages, config, {})).rejects.toThrow(ProviderError);
    if (prev !== undefined) process.env.ANTHROPIC_API_KEY = prev;
  });

  it("throws ProviderError on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "unauthorized",
    }));
    await expect(anthropicAdapter.generate(messages, config, { apiKey: "x" }))
      .rejects.toThrow(/401/);
  });
});
