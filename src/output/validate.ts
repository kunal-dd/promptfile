import type { OutputError, OutputSchema } from "./types.js";

export function validateValue(schema: OutputSchema, value: unknown, path = ""): OutputError[] {
  switch (schema.kind) {
    case "string":
      return typeof value === "string" ? [] : [mismatch(path, "string", value)];
    case "number":
      return typeof value === "number" ? [] : [mismatch(path, "number", value)];
    case "boolean":
      return typeof value === "boolean" ? [] : [mismatch(path, "boolean", value)];
    case "enum":
      return typeof value === "string" && schema.values.includes(value)
        ? []
        : [mismatch(path, `one of [${schema.values.join(", ")}]`, value)];
    case "array": {
      if (!Array.isArray(value)) return [mismatch(path, "array", value)];
      return value.flatMap((item, i) => validateValue(schema.items, item, `${path}[${i}]`));
    }
    case "object": {
      if (typeof value !== "object" || value === null || Array.isArray(value)) {
        return [mismatch(path || "(root)", "object", value)];
      }
      const obj = value as Record<string, unknown>;
      const errors: OutputError[] = [];
      for (const field of schema.fields) {
        const fieldPath = path ? `${path}.${field.name}` : field.name;
        const v = obj[field.name];
        if (v === undefined || v === null) {
          if (field.required) {
            errors.push({ path: fieldPath, expected: typeName(field.schema), got: "missing" });
          }
          continue;
        }
        errors.push(...validateValue(field.schema, v, fieldPath));
      }
      return errors;
    }
    default: {
      const _exhaustive: never = schema;
      throw new Error(`unhandled schema kind: ${String(_exhaustive)}`);
    }
  }
}

function mismatch(path: string, expected: string, value: unknown): OutputError {
  return { path: path || "(root)", expected, got: describe(value) };
}

function describe(value: unknown): string {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value;
}

function typeName(schema: OutputSchema): string {
  switch (schema.kind) {
    case "enum":
      return `one of [${schema.values.join(", ")}]`;
    case "array":
      return "array";
    case "object":
      return "object";
    default:
      return schema.kind;
  }
}
