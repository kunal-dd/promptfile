import { OutputParseError, OutputValidationError } from "../errors.js";
import { extractJson } from "./extract.js";
import { validateValue } from "./validate.js";
import type { OutputSchema } from "./types.js";

export type ReAsk = (prevText: string, problems: string[]) => Promise<string>;

export async function coerce(
  initialText: string,
  schema: OutputSchema,
  reAsk: ReAsk,
  maxRepairs: number
): Promise<{ data: unknown; text: string }> {
  let text = initialText;
  for (let attempt = 0; ; attempt++) {
    const json = extractJson(text);
    if (json === null) {
      if (attempt >= maxRepairs) {
        throw new OutputParseError("No JSON object found in the response.", text);
      }
      text = await reAsk(text, ["No JSON object was found in your response."]);
      continue;
    }
    let value: unknown;
    try {
      value = JSON.parse(json);
    } catch (e) {
      if (attempt >= maxRepairs) {
        throw new OutputParseError(`Response was not valid JSON: ${(e as Error).message}`, text);
      }
      text = await reAsk(text, ["Your response was not valid JSON."]);
      continue;
    }
    const errors = validateValue(schema, value);
    if (errors.length === 0) return { data: value, text };
    if (attempt >= maxRepairs) throw new OutputValidationError(errors, text);
    text = await reAsk(
      text,
      errors.map((e) => `${e.path}: expected ${e.expected}, got ${e.got}`)
    );
  }
}
