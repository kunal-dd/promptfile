import { ProviderError } from "../errors.js";
import type { Message, PromptConfig, RunOptions, RunResult } from "../types.js";
import type { ProviderAdapter } from "./types.js";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

export const openaiAdapter: ProviderAdapter = {
  name: "openai",
  async generate(messages: Message[], config: PromptConfig, opts: RunOptions): Promise<RunResult> {
    const apiKey = opts.apiKey ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ProviderError("No OpenAI API key. Set OPENAI_API_KEY or pass opts.apiKey.");
    }

    const body: Record<string, unknown> = {
      ...config.params,
      model: config.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
    };

    let res: Response;
    try {
      res = await fetch(opts.baseUrl ?? OPENAI_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      });
    } catch (e) {
      throw new ProviderError("Network error calling OpenAI.", e);
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new ProviderError(`OpenAI API error ${res.status}: ${detail}`);
    }

    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content ?? "";
    return { text, raw: data, model: config.model, provider: "openai" };
  },
};
