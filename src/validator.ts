import { PromptValidationError } from "./errors.js";
import { extractVars } from "./template.js";
import type { Inputs, InputSpec, PromptAST } from "./types.js";

export function validateInputs(ast: PromptAST, inputs: Inputs): void {
  const declared = new Set(ast.inputs.map((s) => s.name));

  // 1. Every referenced {{var}} must be declared in `input`.
  for (const msg of ast.messages) {
    for (const name of extractVars(msg.content)) {
      if (!declared.has(name)) {
        throw new PromptValidationError(
          `Template references '{{${name}}}' which is not declared in 'input'.`
        );
      }
    }
  }

  // 2. Required inputs must be present; supplied inputs must match their type.
  for (const spec of ast.inputs) {
    const value = inputs[spec.name];
    if (value === undefined || value === null) {
      if (spec.required) {
        throw new PromptValidationError(`Missing required input '${spec.name}' (${spec.type}).`);
      }
      continue;
    }
    if (!matchesType(value, spec)) {
      throw new PromptValidationError(
        `Input '${spec.name}' must be a ${spec.type}, got ${typeof value}.`
      );
    }
  }
}

function matchesType(value: unknown, spec: InputSpec): boolean {
  switch (spec.type) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number";
    case "boolean":
      return typeof value === "boolean";
  }
}
