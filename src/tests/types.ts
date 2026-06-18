import type { Inputs } from "../types.js";

export type MatcherKind =
  | "rendered_contains"
  | "rendered_not_contains"
  | "rendered_matches"
  | "response_contains"
  | "response_not_contains"
  | "response_matches"
  | "judge";

export interface Assertion {
  kind: MatcherKind;
  value: string;
}

export interface TestCase {
  name: string;
  input: Inputs;
  assert: Assertion[];
  /** True when any assertion targets the live model response (response_* or judge). */
  live: boolean;
  judgeModel?: string;
  judgeProvider?: string;
}

export interface MatchOutcome {
  pass: boolean;
  detail: string;
}

export interface AssertionResult {
  /** Matcher kind, or a synthetic kind for setup failures: "input" | "live" | "provider". */
  kind: string;
  value: string;
  pass: boolean;
  detail: string;
}

export type TestStatus = "passed" | "failed" | "skipped";

export interface TestResult {
  name: string;
  status: TestStatus;
  assertions: AssertionResult[];
  skipReason?: string;
}

export interface TestReport {
  results: TestResult[];
  passed: number;
  failed: number;
  skipped: number;
}
