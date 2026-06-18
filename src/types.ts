import type { TestCase } from "./tests/types.js";

export type Role = "system" | "user" | "assistant";

export interface Message {
  role: Role;
  content: string;
}

export type InputType = "string" | "number" | "boolean";

export interface InputSpec {
  name: string;
  type: InputType;
  required: boolean;
}

export interface PromptConfig {
  model: string;
  provider: string;
  /** Generation params (temperature, max_tokens, ...) passed through to the provider. */
  params: Record<string, unknown>;
}

export interface PromptAST {
  config: PromptConfig;
  inputs: InputSpec[];
  /** Template messages, still containing {{vars}}. */
  messages: Message[];
  /** Parsed `tests:` block; absent/empty when the file declares no tests. */
  tests?: TestCase[];
}

export type Inputs = Record<string, string | number | boolean>;

export interface RunOptions {
  apiKey?: string;
  /** Override the provider endpoint (used in tests). */
  baseUrl?: string;
}

export interface RunResult {
  text: string;
  raw: unknown;
  model: string;
  provider: string;
}
