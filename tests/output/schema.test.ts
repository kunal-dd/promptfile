import { describe, it, expect } from "vitest";
import { parseOutputSchema } from "../../src/output/schema.js";
import { PromptParseError } from "../../src/errors.js";

describe("parseOutputSchema", () => {
  it("parses scalars, optional, enum, array, and nested objects", () => {
    const schema = parseOutputSchema({
      title: "string",
      "subtitle?": "string",
      count: "number",
      tags: "string[]",
      priority: "enum(low, medium, high)",
      author: { name: "string", "handle?": "string" },
    });
    expect(schema).toEqual({
      kind: "object",
      fields: [
        { name: "title", required: true, schema: { kind: "string" } },
        { name: "subtitle", required: false, schema: { kind: "string" } },
        { name: "count", required: true, schema: { kind: "number" } },
        { name: "tags", required: true, schema: { kind: "array", items: { kind: "string" } } },
        { name: "priority", required: true, schema: { kind: "enum", values: ["low", "medium", "high"] } },
        {
          name: "author",
          required: true,
          schema: {
            kind: "object",
            fields: [
              { name: "name", required: true, schema: { kind: "string" } },
              { name: "handle", required: false, schema: { kind: "string" } },
            ],
          },
        },
      ],
    });
  });

  it("throws on an unknown scalar type", () => {
    expect(() => parseOutputSchema({ x: "date" })).toThrow(/unknown type 'date'/);
  });
  it("throws on object-array syntax (deferred feature)", () => {
    expect(() => parseOutputSchema({ items: "Item[]" })).toThrow(/unknown type 'Item'/);
  });
  it("throws when output is not a map", () => {
    expect(() => parseOutputSchema("string")).toThrow(/must be a map/);
  });
  it("throws on an empty enum", () => {
    expect(() => parseOutputSchema({ x: "enum()" })).toThrow(/at least one value/);
  });
});
