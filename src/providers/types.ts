import type { Message, PromptConfig, RunOptions, RunResult } from "../types.js";

export interface ProviderAdapter {
  name: string;
  generate(messages: Message[], config: PromptConfig, opts: RunOptions): Promise<RunResult>;
}
