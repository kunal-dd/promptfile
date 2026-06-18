import type { OutputSchema } from "./types.js";

export function schemaInstruction(schema: OutputSchema): string {
  return (
    "Respond with ONLY a JSON object matching this schema. " +
    "Output raw JSON — no prose, no markdown code fences.\n" +
    describe(schema)
  );
}

function describe(schema: OutputSchema): string {
  switch (schema.kind) {
    case "string":
    case "number":
    case "boolean":
      return schema.kind;
    case "enum":
      return `one of (${schema.values.join(" | ")})`;
    case "array":
      return `${describe(schema.items)}[]`;
    case "object":
      return `{ ${schema.fields
        .map((f) => `${f.name}${f.required ? "" : "?"}: ${describe(f.schema)}`)
        .join(", ")} }`;
  }
}
