import type { OutputSchema } from "./types.js";

export function toJsonSchema(schema: OutputSchema): Record<string, unknown> {
  switch (schema.kind) {
    case "string":
      return { type: "string" };
    case "number":
      return { type: "number" };
    case "boolean":
      return { type: "boolean" };
    case "enum":
      return { type: "string", enum: schema.values };
    case "array":
      return { type: "array", items: toJsonSchema(schema.items) };
    case "object": {
      const properties: Record<string, unknown> = {};
      const required: string[] = [];
      for (const field of schema.fields) {
        properties[field.name] = toJsonSchema(field.schema);
        if (field.required) required.push(field.name);
      }
      return { type: "object", properties, required, additionalProperties: false };
    }
    default: {
      const _exhaustive: never = schema;
      throw new Error(`unhandled schema kind: ${String(_exhaustive)}`);
    }
  }
}
