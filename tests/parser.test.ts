import { describe, it, expect } from "vitest";
import { parse } from "../src/parser.js";
import { PromptParseError } from "../src/errors.js";

const FULL = `---
model: claude-opus-4-8
provider: anthropic
temperature: 0.7
input:
  name: string
  tone?: string
---
<system>
You are a friendly assistant.
</system>

<user>
Write a {{tone}} greeting for {{name}}.
</user>
`;

describe("parse", () => {
  it("parses config, params, inputs, and messages", () => {
    const ast = parse(FULL);
    expect(ast.config.model).toBe("claude-opus-4-8");
    expect(ast.config.provider).toBe("anthropic");
    expect(ast.config.params).toEqual({ temperature: 0.7 });
    expect(ast.inputs).toEqual([
      { name: "name", type: "string", required: true },
      { name: "tone", type: "string", required: false },
    ]);
    expect(ast.messages).toEqual([
      { role: "system", content: "You are a friendly assistant." },
      { role: "user", content: "Write a {{tone}} greeting for {{name}}." },
    ]);
  });

  it("treats a body with no role markers as a single user message", () => {
    const ast = parse(`---\nmodel: m\nprovider: openai\n---\nJust say hi.`);
    expect(ast.messages).toEqual([{ role: "user", content: "Just say hi." }]);
  });

  it("throws when frontmatter is missing", () => {
    expect(() => parse("no frontmatter here")).toThrow(PromptParseError);
  });

  it("throws when model is missing", () => {
    expect(() => parse(`---\nprovider: openai\n---\nhi`)).toThrow(/model/);
  });

  it("throws when provider is missing", () => {
    expect(() => parse(`---\nmodel: m\n---\nhi`)).toThrow(/provider/);
  });

  it("throws on an invalid input type", () => {
    expect(() => parse(`---\nmodel: m\nprovider: openai\ninput:\n  x: date\n---\nhi`))
      .toThrow(/invalid type/);
  });

  it("throws on an empty body", () => {
    expect(() => parse(`---\nmodel: m\nprovider: openai\n---\n   `)).toThrow(/empty/);
  });
});
