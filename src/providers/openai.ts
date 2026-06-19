import { ProviderError } from "../errors.js";
import type { Message, PromptConfig, RunOptions, RunResult } from "../types.js";
import type { ProviderAdapter } from "./types.js";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";

async function* sseLines(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line.startsWith("data:")) yield line.slice(5).trim();
    }
  }
}

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

  async *generateStream(messages: Message[], config: PromptConfig, opts: RunOptions) {
    const apiKey = opts.apiKey ?? process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new ProviderError("No OpenAI API key. Set OPENAI_API_KEY or pass opts.apiKey.");
    }
    const body: Record<string, unknown> = {
      ...config.params,
      model: config.model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      stream: true,
    };
    const res = await fetch(opts.baseUrl ?? OPENAI_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify(body),
    });
    if (!res.ok || !res.body) {
      const detail = res.ok ? "no response body" : await res.text().catch(() => "");
      throw new ProviderError(`OpenAI API error ${res.status}: ${detail}`);
    }
    for await (const data of sseLines(res.body)) {
      if (data === "[DONE]") break;
      try {
        const evt = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
        const text = evt.choices?.[0]?.delta?.content;
        if (text) yield text;
      } catch {
        // ignore non-JSON keepalive lines
      }
    }
  },
};
