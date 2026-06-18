import { readFile } from "node:fs/promises";
import { parse } from "./parser.js";
import { renderMessages } from "./renderer.js";
import { getAdapter } from "./providers/registry.js";
import type { Inputs, InputSpec, Message, PromptAST, PromptConfig, RunOptions, RunResult } from "./types.js";
import type { TestCase } from "./tests/types.js";
import type { OutputSchema } from "./output/types.js";

export class Prompt {
  constructor(private readonly ast: PromptAST) {}

  get config(): PromptConfig {
    return this.ast.config;
  }

  get inputs(): InputSpec[] {
    return this.ast.inputs;
  }

  get tests(): TestCase[] {
    return this.ast.tests ?? [];
  }

  get output(): OutputSchema | undefined {
    return this.ast.output;
  }

  render(inputs: Inputs = {}): Message[] {
    return renderMessages(this.ast, inputs);
  }

  async run(inputs: Inputs = {}, opts: RunOptions = {}): Promise<RunResult> {
    const messages = this.render(inputs);
    const adapter = getAdapter(this.ast.config.provider);
    return adapter.generate(messages, this.ast.config, opts);
  }
}

export function parsePrompt(text: string): Prompt {
  return new Prompt(parse(text));
}

export async function loadPrompt(path: string): Promise<Prompt> {
  const text = await readFile(path, "utf8");
  return parsePrompt(text);
}
