import { readFile } from "node:fs/promises";
import { parse } from "./parser.js";
import { renderMessages } from "./renderer.js";
import { getAdapter } from "./providers/registry.js";
import type { Inputs, InputSpec, Message, PromptAST, PromptConfig, RunOptions, RunResult } from "./types.js";
import type { TestCase } from "./tests/types.js";
import type { OutputSchema } from "./output/types.js";
import { schemaInstruction } from "./output/instruction.js";
import { coerce, type ReAsk } from "./output/repair.js";
import { StructuredStream } from "./output/stream.js";
import type { ProviderAdapter } from "./providers/types.js";
import { ProviderError } from "./errors.js";
import { toJsonSchema } from "./output/json-schema.js";

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

  private buildStructured(
    messages: Message[],
    schema: OutputSchema,
    opts: RunOptions
  ): { baseMessages: Message[]; reAsk: ReAsk } {
    const adapter = getAdapter(this.ast.config.provider);
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
    return { baseMessages, reAsk };
  }

  async run<T = unknown>(inputs: Inputs = {}, opts: RunOptions = {}): Promise<RunResult<T>> {
    const messages = this.render(inputs);
    const adapter = getAdapter(this.ast.config.provider);
    if (!this.ast.output) {
      return (await adapter.generate(messages, this.ast.config, opts)) as RunResult<T>;
    }
    const schema = this.ast.output;
    const { baseMessages, reAsk } = this.buildStructured(messages, schema, opts);
    const useNative = resolveNative(adapter, opts.outputMode);
    const first = useNative
      ? await adapter.generateStructured!(messages, this.ast.config, toJsonSchema(schema), opts)
      : await adapter.generate(baseMessages, this.ast.config, opts);
    const { data, text } = await coerce(first.text, schema, reAsk, opts.repair ?? 1);
    return { ...first, text, data } as RunResult<T>;
  }

  stream<T = unknown>(inputs: Inputs = {}, opts: RunOptions = {}): StructuredStream<T> {
    const messages = this.render(inputs);
    const adapter = getAdapter(this.ast.config.provider);
    const schema = this.ast.output;

    if (!schema) {
      const source = streamFrom(adapter, messages, this.ast.config, opts);
      return new StructuredStream<T>(source, undefined, async (text) => ({
        data: undefined as T,
        text,
      }));
    }

    const { baseMessages, reAsk } = this.buildStructured(messages, schema, opts);
    const source = streamFrom(adapter, baseMessages, this.ast.config, opts);
    return new StructuredStream<T>(source, schema, (text) =>
      coerce(text, schema, reAsk, opts.repair ?? 1) as Promise<{ data: T; text: string }>
    );
  }
}

function resolveNative(adapter: ProviderAdapter, mode: RunOptions["outputMode"]): boolean {
  const m = mode ?? "auto";
  if (m === "prompt") return false;
  const supported = typeof adapter.generateStructured === "function";
  if (m === "native") {
    if (!supported) {
      throw new ProviderError(`native structured output not supported by provider '${adapter.name}'`);
    }
    return true;
  }
  return supported; // "auto"
}

function streamFrom(
  adapter: ProviderAdapter,
  messages: Message[],
  config: PromptConfig,
  opts: RunOptions
): AsyncIterable<string> {
  if (adapter.generateStream) return adapter.generateStream(messages, config, opts);
  return (async function* single() {
    const result = await adapter.generate(messages, config, opts);
    yield result.text;
  })();
}

export function parsePrompt(text: string): Prompt {
  return new Prompt(parse(text));
}

export async function loadPrompt(path: string): Promise<Prompt> {
  const text = await readFile(path, "utf8");
  return parsePrompt(text);
}
