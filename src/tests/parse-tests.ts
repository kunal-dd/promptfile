import { PromptParseError } from "../errors.js";
import type { Inputs } from "../types.js";
import type { Assertion, MatcherKind, TestCase } from "./types.js";

const RESPONSE_KEYS = new Set<MatcherKind>([
  "response_contains",
  "response_not_contains",
  "response_matches",
  "judge",
]);
const ALL_KEYS = new Set<string>([
  "rendered_contains",
  "rendered_not_contains",
  "rendered_matches",
  "response_contains",
  "response_not_contains",
  "response_matches",
  "judge",
]);

export function parseTests(raw: unknown): TestCase[] {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw)) {
    throw new PromptParseError("Frontmatter 'tests' must be a list.");
  }
  return raw.map((entry, i) => parseTest(entry, i));
}

function parseTest(entry: unknown, index: number): TestCase {
  if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
    throw new PromptParseError(`Test #${index + 1} must be a map.`);
  }
  const e = entry as Record<string, unknown>;
  const name = e.name;
  if (typeof name !== "string" || name.length === 0) {
    throw new PromptParseError(`Test #${index + 1} is missing a 'name'.`);
  }

  const rawAssert = e.assert;
  if (!Array.isArray(rawAssert) || rawAssert.length === 0) {
    throw new PromptParseError(`Test '${name}' must have a non-empty 'assert' list.`);
  }
  const assert = rawAssert.map((a) => parseAssertion(a, name));
  const live = assert.some((a) => RESPONSE_KEYS.has(a.kind));

  const rawInput = e.input ?? {};
  if (typeof rawInput !== "object" || rawInput === null || Array.isArray(rawInput)) {
    throw new PromptParseError(`Test '${name}' has an invalid 'input' (must be a map).`);
  }

  const test: TestCase = { name, input: rawInput as Inputs, assert, live };
  if (typeof e.judge_model === "string") test.judgeModel = e.judge_model;
  if (typeof e.judge_provider === "string") test.judgeProvider = e.judge_provider;
  return test;
}

function parseAssertion(a: unknown, testName: string): Assertion {
  if (typeof a !== "object" || a === null || Array.isArray(a)) {
    throw new PromptParseError(`Test '${testName}' has an assertion that is not a map.`);
  }
  const keys = Object.keys(a as Record<string, unknown>);
  if (keys.length !== 1) {
    throw new PromptParseError(
      `Test '${testName}': each assertion must have exactly one matcher key, got [${keys.join(", ")}].`
    );
  }
  const kind = keys[0]!;
  if (!ALL_KEYS.has(kind)) {
    throw new PromptParseError(
      `Test '${testName}': unknown matcher '${kind}'. Valid: ${[...ALL_KEYS].join(", ")}.`
    );
  }
  const value = (a as Record<string, unknown>)[kind];
  if (typeof value !== "string") {
    throw new PromptParseError(`Test '${testName}': matcher '${kind}' must have a string value.`);
  }
  return { kind: kind as MatcherKind, value };
}
