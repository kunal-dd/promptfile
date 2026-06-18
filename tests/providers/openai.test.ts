import { describe, it, expect, vi, afterEach } from "vitest";
import { openaiAdapter } from "../../src/providers/openai.js";
import { ProviderError } from "../../src/errors.js";
import type { Message, PromptConfig } from "../../src/types.js";

const messages: Message[] = [
  { role: "system", content: "Be nice." },
  { role: "user", content: "Hi" },
];
const config: PromptConfig = { model: "gpt-4o", provider: "openai", params: { temperature: 0.2 } };

afterEach(() => vi.unstubAllGlobals());

describe("openaiAdapter", () => {
  it("sends all messages inline and returns choice content", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: "Hello!" } }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await openaiAdapter.generate(messages, config, { apiKey: "sk-test" });

    expect(result.text).toBe("Hello!");
    expect(result.provider).toBe("openai");
    const call = fetchMock.mock.calls[0];
    expect(call[1].headers.authorization).toBe("Bearer sk-test");
    const body = JSON.parse(call[1].body);
    expect(body.messages).toEqual(messages);
    expect(body.temperature).toBe(0.2);
  });

  it("throws ProviderError when no API key", async () => {
    const prev = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    await expect(openaiAdapter.generate(messages, config, {})).rejects.toThrow(ProviderError);
    if (prev !== undefined) process.env.OPENAI_API_KEY = prev;
  });

  it("throws ProviderError on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      text: async () => "rate limited",
    }));
    await expect(openaiAdapter.generate(messages, config, { apiKey: "x" }))
      .rejects.toThrow(/429/);
  });
});
