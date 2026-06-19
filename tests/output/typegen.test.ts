import { describe, it, expect } from "vitest";
import { toTypeScript } from "../../src/output/typegen.js";
import { parseOutputSchema } from "../../src/output/schema.js";

describe("toTypeScript", () => {
  it("emits an interface with nesting, object arrays, enums, and optional fields", () => {
    const schema = parseOutputSchema({
      title: "string",
      "items[]": { name: "string", qty: "number" },
      priority: "enum(low, high)",
      "tags?": "string[]",
    });
    expect(toTypeScript(schema, "Extract")).toBe(
      `export interface Extract {
  title: string;
  items: {
    name: string;
    qty: number;
  }[];
  priority: "low" | "high";
  tags?: string[];
}
`
    );
  });
});
