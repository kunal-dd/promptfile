import { describe, it, expect, vi, afterEach } from "vitest";
import { openaiAdapter } from "../../src/providers/openai.js";
import type { Message, PromptConfig } from "../../src/types.js";

const messages: Message[] = [{ role: "user", content: "Hi" }];
const config: PromptConfig = { model: "gpt-4o", provider: "openai", params: {} };

function sseStream(lines: string[]): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const l of lines) controller.enqueue(enc.encode(l));
      controller.close();
    },
  });
}

afterEach(() => vi.unstubAllGlobals());

describe("openaiAdapter.generateStream", () => {
  it("yields content deltas and stops at [DONE]", async () => {
    const body = sseStream([
      'data: {"choices":[{"delta":{"content":"Hel"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":"lo"}}]}\n\n',
      "data: [DONE]\n\n",
    ]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, body }));

    const out: string[] = [];
    for await (const t of openaiAdapter.generateStream!(messages, config, { apiKey: "x" })) {
      out.push(t);
    }
    expect(out.join("")).toBe("Hello");
  });
});
