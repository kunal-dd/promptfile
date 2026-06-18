import type { OutputError } from "./output/types.js";

export class PromptParseError extends Error {
  constructor(message: string, public readonly line?: number) {
    super(message);
    this.name = "PromptParseError";
  }
}

export class PromptValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PromptValidationError";
  }
}

export class ProviderError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = "ProviderError";
  }
}

export class OutputParseError extends Error {
  constructor(message: string, public readonly rawText: string) {
    super(message);
    this.name = "OutputParseError";
  }
}

export class OutputValidationError extends Error {
  constructor(public readonly errors: OutputError[], public readonly rawText: string) {
    super(
      `Output failed schema validation:\n${errors
        .map((e) => `  ${e.path}: expected ${e.expected}, got ${e.got}`)
        .join("\n")}`
    );
    this.name = "OutputValidationError";
  }
}
