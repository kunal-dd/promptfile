import type { Message, PromptConfig, RunOptions, RunResult } from "../types.js";

export interface ProviderAdapter {
  name: string;
  generate(messages: Message[], config: PromptConfig, opts: RunOptions): Promise<RunResult>;
  generateStream?(
    messages: Message[],
    config: PromptConfig,
    opts: RunOptions
  ): AsyncIterable<string>;
  generateStructured?(
    messages: Message[],
    config: PromptConfig,
    jsonSchema: Record<string, unknown>,
    opts: RunOptions
  ): Promise<RunResult>;
}
