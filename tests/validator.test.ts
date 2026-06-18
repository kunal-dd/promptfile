import { describe, it, expect } from "vitest";
import { validateInputs } from "../src/validator.js";
import { PromptValidationError } from "../src/errors.js";
import type { PromptAST } from "../src/types.js";

function ast(partial: Partial<PromptAST>): PromptAST {
  return {
    config: { model: "m", provider: "openai", params: {} },
    inputs: [],
    messages: [{ role: "user", content: "hi" }],
    ...partial,
  };
}

describe("validateInputs", () => {
  it("passes when required inputs are present and well-typed", () => {
    const a = ast({
      inputs: [{ name: "name", type: "string", required: true }],
      messages: [{ role: "user", content: "Hi {{name}}" }],
    });
    expect(() => validateInputs(a, { name: "Kunal" })).not.toThrow();
  });

  it("throws when a required input is missing", () => {
    const a = ast({ inputs: [{ name: "name", type: "string", required: true }] });
    expect(() => validateInputs(a, {})).toThrow(/Missing required input 'name'/);
  });

  it("allows an optional input to be absent", () => {
    const a = ast({ inputs: [{ name: "tone", type: "string", required: false }] });
    expect(() => validateInputs(a, {})).not.toThrow();
  });

  it("throws on a type mismatch", () => {
    const a = ast({ inputs: [{ name: "n", type: "number", required: true }] });
    expect(() => validateInputs(a, { n: "not-a-number" as unknown as number }))
      .toThrow(/must be a number/);
  });

  it("throws when a template references an undeclared variable", () => {
    const a = ast({ messages: [{ role: "user", content: "Hi {{ghost}}" }] });
    expect(() => validateInputs(a, {})).toThrow(/'\{\{ghost\}\}'/);
  });
});
