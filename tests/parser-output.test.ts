import { describe, it, expect } from "vitest";
import { parsePrompt } from "../src/prompt.js";

const SRC = `---
model: m
provider: openai
output:
  title: string
  tags: string[]
---
<user>
Write something.
</user>
`;

describe("parser + Prompt output integration", () => {
  it("exposes the parsed output schema via Prompt.output", () => {
    const p = parsePrompt(SRC);
    expect(p.output).toEqual({
      kind: "object",
      fields: [
        { name: "title", required: true, schema: { kind: "string" } },
        { name: "tags", required: true, schema: { kind: "array", items: { kind: "string" } } },
      ],
    });
  });

  it("output is undefined when there is no output block", () => {
    expect(parsePrompt(`---\nmodel: m\nprovider: openai\n---\nhi`).output).toBeUndefined();
  });
});
