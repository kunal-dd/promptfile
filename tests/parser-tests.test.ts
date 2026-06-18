import { describe, it, expect } from "vitest";
import { parsePrompt } from "../src/prompt.js";

const SRC = `---
model: m
provider: openai
input:
  name: string
tests:
  - name: greets
    input: { name: Kunal }
    assert:
      - rendered_contains: "Hi"
---
<user>
Hi {{name}}
</user>
`;

describe("parser + Prompt tests integration", () => {
  it("exposes parsed tests via Prompt.tests", () => {
    const p = parsePrompt(SRC);
    expect(p.tests).toEqual([
      {
        name: "greets",
        input: { name: "Kunal" },
        assert: [{ kind: "rendered_contains", value: "Hi" }],
        live: false,
      },
    ]);
  });

  it("returns an empty array when there is no tests block", () => {
    const p = parsePrompt(`---\nmodel: m\nprovider: openai\n---\nhi`);
    expect(p.tests).toEqual([]);
  });
});
