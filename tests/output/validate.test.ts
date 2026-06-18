import { describe, it, expect } from "vitest";
import { validateValue } from "../../src/output/validate.js";
import type { OutputSchema } from "../../src/output/types.js";

const schema: OutputSchema = {
  kind: "object",
  fields: [
    { name: "title", required: true, schema: { kind: "string" } },
    { name: "subtitle", required: false, schema: { kind: "string" } },
    { name: "tags", required: true, schema: { kind: "array", items: { kind: "string" } } },
    { name: "priority", required: true, schema: { kind: "enum", values: ["low", "high"] } },
    {
      name: "author",
      required: true,
      schema: { kind: "object", fields: [{ name: "name", required: true, schema: { kind: "string" } }] },
    },
  ],
};

describe("validateValue", () => {
  it("returns no errors for a valid value", () => {
    expect(
      validateValue(schema, {
        title: "x",
        tags: ["a", "b"],
        priority: "low",
        author: { name: "Kunal" },
      })
    ).toEqual([]);
  });

  it("reports missing required fields with paths", () => {
    const errors = validateValue(schema, { tags: [], priority: "low", author: {} });
    expect(errors).toContainEqual({ path: "title", expected: "string", got: "missing" });
    expect(errors).toContainEqual({ path: "author.name", expected: "string", got: "missing" });
  });

  it("reports type mismatches and bad enum/array items", () => {
    const errors = validateValue(schema, {
      title: 5,
      tags: ["ok", 2],
      priority: "medium",
      author: { name: "x" },
    });
    expect(errors).toContainEqual({ path: "title", expected: "string", got: "number" });
    expect(errors).toContainEqual({ path: "tags[1]", expected: "string", got: "number" });
    expect(errors).toContainEqual({ path: "priority", expected: "one of [low, high]", got: "string" });
  });

  it("allows optional fields to be absent", () => {
    const errors = validateValue(schema, { title: "x", tags: [], priority: "high", author: { name: "y" } });
    expect(errors).toEqual([]);
  });
});
