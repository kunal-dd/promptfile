import { describe, it, expect } from "vitest";
import { renderMessages } from "../src/renderer.js";
import { PromptValidationError } from "../src/errors.js";
import type { PromptAST } from "../src/types.js";

const ast: PromptAST = {
  config: { model: "m", provider: "anthropic", params: {} },
  inputs: [
    { name: "name", type: "string", required: true },
    { name: "tone", type: "string", required: true },
  ],
  messages: [
    { role: "system", content: "You are helpful." },
    { role: "user", content: "Write a {{tone}} note for {{name}}." },
  ],
};

describe("renderMessages", () => {
  it("validates then substitutes variables", () => {
    expect(renderMessages(ast, { name: "Kunal", tone: "warm" })).toEqual([
      { role: "system", content: "You are helpful." },
      { role: "user", content: "Write a warm note for Kunal." },
    ]);
  });

  it("throws via the validator on missing input", () => {
    expect(() => renderMessages(ast, { name: "Kunal" } as never)).toThrow(PromptValidationError);
  });
});
