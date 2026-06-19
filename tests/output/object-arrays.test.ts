import { describe, it, expect } from "vitest";
import { parseOutputSchema } from "../../src/output/schema.js";
import { validateValue } from "../../src/output/validate.js";
import { schemaInstruction } from "../../src/output/instruction.js";
import { PromptParseError } from "../../src/errors.js";

describe("object arrays", () => {
  it("parses a required `items[]:` map as an array of objects", () => {
    const schema = parseOutputSchema({
      title: "string",
      "items[]": { name: "string", qty: "number" },
    });
    expect(schema).toEqual({
      kind: "object",
      fields: [
        { name: "title", required: true, schema: { kind: "string" } },
        {
          name: "items",
          required: true,
          schema: {
            kind: "array",
            items: {
              kind: "object",
              fields: [
                { name: "name", required: true, schema: { kind: "string" } },
                { name: "qty", required: true, schema: { kind: "number" } },
              ],
            },
          },
        },
      ],
    });
  });

  it("parses `reviewers[]?:` as an optional array of objects", () => {
    const schema = parseOutputSchema({ "reviewers[]?": { name: "string" } });
    expect(schema.kind).toBe("object");
    const field = (schema as { fields: Array<{ name: string; required: boolean; schema: { kind: string } }> }).fields[0]!;
    expect(field).toMatchObject({ name: "reviewers", required: false, schema: { kind: "array" } });
  });

  it("throws when a `[]` key's value is not a map", () => {
    expect(() => parseOutputSchema({ "items[]": "string" })).toThrow(PromptParseError);
  });

  it("validates and renders an instruction for object arrays", () => {
    const schema = parseOutputSchema({ "items[]": { name: "string" } });
    expect(validateValue(schema, { items: [{ name: "a" }, { name: "b" }] })).toEqual([]);
    expect(validateValue(schema, { items: [{ name: 1 }] })).toContainEqual({
      path: "items[0].name",
      expected: "string",
      got: "number",
    });
    expect(schemaInstruction(schema)).toContain("{ name: string }[]");
  });
});
