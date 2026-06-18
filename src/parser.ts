import { parse as parseYaml } from "yaml";
import { PromptParseError } from "./errors.js";
import type { InputSpec, InputType, Message, PromptAST, PromptConfig, Role } from "./types.js";

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;
const ROLE_BLOCK_RE = /<(system|user|assistant)>([\s\S]*?)<\/\1>/g;
const VALID_TYPES: InputType[] = ["string", "number", "boolean"];
const RESERVED_KEYS = new Set(["model", "provider", "input", "output", "tests"]);

export function parse(text: string): PromptAST {
  const match = text.match(FRONTMATTER_RE);
  if (!match) {
    throw new PromptParseError(
      "Missing or malformed frontmatter. A .prompt file must start with a YAML block delimited by '---'.",
      1
    );
  }
  const yamlSrc = match[1]!;
  const body = match[2]!;

  let frontmatter: Record<string, unknown>;
  try {
    frontmatter = (parseYaml(yamlSrc) as Record<string, unknown>) ?? {};
  } catch (e) {
    const err = e as { message: string; linePos?: Array<{ line: number; col: number }> };
    // yaml reports positions within the frontmatter block; +1 accounts for the opening '---' line.
    const yamlLine = err.linePos?.[0]?.line;
    throw new PromptParseError(
      `Invalid YAML in frontmatter: ${err.message}`,
      yamlLine === undefined ? undefined : yamlLine + 1
    );
  }

  return {
    config: parseConfig(frontmatter),
    inputs: parseInputs(frontmatter.input),
    messages: parseBody(body),
  };
}

function parseConfig(fm: Record<string, unknown>): PromptConfig {
  const model = fm.model;
  const provider = fm.provider;
  if (typeof model !== "string" || model.length === 0) {
    throw new PromptParseError("Frontmatter is missing a required 'model' string.");
  }
  if (typeof provider !== "string" || provider.length === 0) {
    throw new PromptParseError("Frontmatter is missing a required 'provider' string.");
  }
  const params: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fm)) {
    if (!RESERVED_KEYS.has(key)) params[key] = value;
  }
  return { model, provider, params };
}

function parseInputs(raw: unknown): InputSpec[] {
  if (raw === undefined || raw === null) return [];
  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new PromptParseError("Frontmatter 'input' must be a map of name: type.");
  }
  const specs: InputSpec[] = [];
  for (const [rawName, rawType] of Object.entries(raw as Record<string, unknown>)) {
    const required = !rawName.endsWith("?");
    const name = required ? rawName : rawName.slice(0, -1);
    if (typeof rawType !== "string" || !VALID_TYPES.includes(rawType as InputType)) {
      throw new PromptParseError(
        `Input '${name}' has invalid type '${String(rawType)}'. Valid types: ${VALID_TYPES.join(", ")}.`
      );
    }
    specs.push({ name, type: rawType as InputType, required });
  }
  return specs;
}

function parseBody(body: string): Message[] {
  const messages: Message[] = [];
  let match: RegExpExecArray | null;
  ROLE_BLOCK_RE.lastIndex = 0;
  while ((match = ROLE_BLOCK_RE.exec(body)) !== null) {
    messages.push({ role: match[1] as Role, content: match[2]!.trim() });
  }
  if (messages.length === 0) {
    const trimmed = body.trim();
    if (trimmed.length === 0) {
      throw new PromptParseError("Prompt body is empty.");
    }
    return [{ role: "user", content: trimmed }];
  }
  return messages;
}
