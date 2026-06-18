import { PromptParseError } from "../errors.js";
import type { OutputField, OutputSchema } from "./types.js";

export function parseOutputSchema(raw: unknown): OutputSchema {
  return parseObject(raw, "output");
}

function parseObject(raw: unknown, path: string): OutputSchema {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new PromptParseError(`Output schema at '${path}' must be a map of field: type.`);
  }
  const fields: OutputField[] = [];
  for (const [rawName, value] of Object.entries(raw as Record<string, unknown>)) {
    const required = !rawName.endsWith("?");
    const name = required ? rawName : rawName.slice(0, -1);
    fields.push({ name, required, schema: parseNode(value, `${path}.${name}`) });
  }
  return { kind: "object", fields };
}

function parseNode(value: unknown, path: string): OutputSchema {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return parseObject(value, path);
  }
  if (typeof value === "string") {
    return parseTypeExpr(value.trim(), path);
  }
  throw new PromptParseError(`Output field '${path}' must be a type string or a nested map.`);
}

function parseTypeExpr(expr: string, path: string): OutputSchema {
  if (expr.endsWith("[]")) {
    return { kind: "array", items: parseScalarOrEnum(expr.slice(0, -2).trim(), path) };
  }
  return parseScalarOrEnum(expr, path);
}

function parseScalarOrEnum(expr: string, path: string): OutputSchema {
  if (expr === "string" || expr === "number" || expr === "boolean") {
    return { kind: expr };
  }
  const m = expr.match(/^enum\((.*)\)$/);
  if (m) {
    const values = m[1]!
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v.length > 0);
    if (values.length === 0) {
      throw new PromptParseError(`Output field '${path}': enum() needs at least one value.`);
    }
    return { kind: "enum", values };
  }
  throw new PromptParseError(`Output field '${path}': unknown type '${expr}'.`);
}
