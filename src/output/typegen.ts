import type { OutputSchema } from "./types.js";

export function toTypeScript(schema: OutputSchema, name: string): string {
  return `export interface ${name} ${renderType(schema, 0)}\n`;
}

function renderType(schema: OutputSchema, indent: number): string {
  switch (schema.kind) {
    case "string":
    case "number":
    case "boolean":
      return schema.kind;
    case "enum":
      return schema.values.map((v) => JSON.stringify(v)).join(" | ");
    case "array":
      return `${renderType(schema.items, indent)}[]`;
    case "object": {
      const fieldPad = "  ".repeat(indent + 1);
      const closePad = "  ".repeat(indent);
      const lines = schema.fields.map(
        (f) => `${fieldPad}${f.name}${f.required ? "" : "?"}: ${renderType(f.schema, indent + 1)};`
      );
      return `{\n${lines.join("\n")}\n${closePad}}`;
    }
    default: {
      const _exhaustive: never = schema;
      throw new Error(`unhandled schema kind: ${String(_exhaustive)}`);
    }
  }
}
