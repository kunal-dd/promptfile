import { readFile } from "node:fs/promises";
import { parse } from "./parser.js";
import { renderMessages } from "./renderer.js";
import { getAdapter } from "./providers/registry.js";
import type { Inputs, InputSpec, Message, PromptAST, PromptConfig, RunOptions, RunResult } from "./types.js";
import type { TestCase } from "./tests/types.js";
import type { OutputSchema } from "./output/types.js";
import { schemaInstruction } from "./output/instruction.js";
import { coerce, type ReAsk } from "./output/repair.js";

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
    if (!this.ast.output) {
      return adapter.generate(messages, this.ast.config, opts);
    }
    const schema = this.ast.output;
    const baseMessages: Message[] = [
      ...messages,
      { role: "system", content: schemaInstruction(schema) },
    ];
    const reAsk: ReAsk = async (prevText, problems) => {
      const repairMessages: Message[] = [
        ...baseMessages,
        { role: "assistant", content: prevText },
        {
          role: "user",
          content: `Your previous output was invalid:\n${problems.join(
            "\n"
          )}\nReturn corrected JSON only — no prose, no code fences.`,
        },
      ];
      return (await adapter.generate(repairMessages, this.ast.config, opts)).text;
    };
    const first = await adapter.generate(baseMessages, this.ast.config, opts);
    const { data, text } = await coerce(first.text, schema, reAsk, opts.repair ?? 1);
    return { ...first, text, data };
  }
}

export function parsePrompt(text: string): Prompt {
  return new Prompt(parse(text));
}

export async function loadPrompt(path: string): Promise<Prompt> {
  const text = await readFile(path, "utf8");
  return parsePrompt(text);
}
