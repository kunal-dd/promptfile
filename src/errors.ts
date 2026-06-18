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
