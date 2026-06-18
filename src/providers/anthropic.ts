import { ProviderError } from "../errors.js";
import type { Message, PromptConfig, RunOptions, RunResult } from "../types.js";
import type { ProviderAdapter } from "./types.js";

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";

export const anthropicAdapter: ProviderAdapter = {
  name: "anthropic",
  async generate(messages: Message[], config: PromptConfig, opts: RunOptions): Promise<RunResult> {
    const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new ProviderError("No Anthropic API key. Set ANTHROPIC_API_KEY or pass opts.apiKey.");
    }

    const system = messages
      .filter((m) => m.role === "system")
      .map((m) => m.content)
      .join("\n\n");
    const turns = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content }));

    const body: Record<string, unknown> = {
      ...config.params,
      model: config.model,
      max_tokens: (config.params.max_tokens as number | undefined) ?? 1024,
      messages: turns,
    };
    if (system) body.system = system;

    let res: Response;
    try {
      res = await fetch(opts.baseUrl ?? ANTHROPIC_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": ANTHROPIC_VERSION,
        },
        body: JSON.stringify(body),
      });
    } catch (e) {
      throw new ProviderError("Network error calling Anthropic.", e);
    }
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new ProviderError(`Anthropic API error ${res.status}: ${detail}`);
    }

    const data = (await res.json()) as { content?: Array<{ text?: string }> };
    const text = (data.content ?? []).map((b) => b.text ?? "").join("");
    return { text, raw: data, model: config.model, provider: "anthropic" };
  },
};
