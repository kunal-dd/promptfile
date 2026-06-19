import { describe, it, expect, vi, afterEach } from "vitest";
import { anthropicAdapter } from "../../src/providers/anthropic.js";
import type { Message, PromptConfig } from "../../src/types.js";

const messages: Message[] = [{ role: "user", content: "Hi" }];
const config: PromptConfig = { model: "claude-opus-4-8", provider: "anthropic", params: {} };

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

describe("anthropicAdapter.generateStream", () => {
  it("yields text deltas from the SSE stream", async () => {
    const body = sseStream([
      'event: content_block_delta\n',
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hel"}}\n\n',
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"lo"}}\n\n',
      'data: {"type":"message_stop"}\n\n',
    ]);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, body }));

    const out: string[] = [];
    for await (const t of anthropicAdapter.generateStream!(messages, config, { apiKey: "x" })) {
      out.push(t);
    }
    expect(out.join("")).toBe("Hello");
  });
});
