import { describe, it, expect } from "vitest";
import { toJsonSchema } from "../../src/output/json-schema.js";
import { parseOutputSchema } from "../../src/output/schema.js";

describe("toJsonSchema", () => {
  it("maps scalars, enum, optional, scalar arrays, object arrays, and nesting", () => {
    const schema = parseOutputSchema({
      title: "string",
      "subtitle?": "string",
      priority: "enum(low, high)",
      tags: "string[]",
      "items[]": { name: "string", qty: "number" },
    });
    expect(toJsonSchema(schema)).toEqual({
      type: "object",
      additionalProperties: false,
      required: ["title", "priority", "tags", "items"],
      properties: {
        title: { type: "string" },
        subtitle: { type: "string" },
        priority: { type: "string", enum: ["low", "high"] },
        tags: { type: "array", items: { type: "string" } },
        items: {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["name", "qty"],
            properties: { name: { type: "string" }, qty: { type: "number" } },
          },
        },
      },
    });
  });
});
