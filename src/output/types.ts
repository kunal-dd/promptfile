export type OutputSchema =
  | { kind: "string" }
  | { kind: "number" }
  | { kind: "boolean" }
  | { kind: "enum"; values: string[] }
  | { kind: "array"; items: OutputSchema }
  | { kind: "object"; fields: OutputField[] };

export interface OutputField {
  name: string;
  required: boolean;
  schema: OutputSchema;
}

export interface OutputError {
  path: string;
  expected: string;
  got: string;
}
