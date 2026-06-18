import { describe, it, expect } from "vitest";
import { schemaInstruction } from "../../src/output/instruction.js";
import type { OutputSchema } from "../../src/output/types.js";

const schema: OutputSchema = {
  kind: "object",
  fields: [
    { name: "title", required: true, schema: { kind: "string" } },
    { name: "handle", required: false, schema: { kind: "string" } },
    { name: "tags", required: true, schema: { kind: "array", items: { kind: "string" } } },
    { name: "priority", required: true, schema: { kind: "enum", values: ["low", "high"] } },
  ],
};

describe("schemaInstruction", () => {
  it("describes the schema and demands raw JSON", () => {
    const out = schemaInstruction(schema);
    expect(out).toContain("ONLY a JSON object");
    expect(out).toContain("no markdown code fences");
    expect(out).toContain("title: string");
    expect(out).toContain("handle?: string");
    expect(out).toContain("tags: string[]");
    expect(out).toContain("priority: one of (low | high)");
  });
});
