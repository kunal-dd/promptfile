import { getAdapter } from "../providers/registry.js";
import type { RunOptions } from "../types.js";
import type { MatchOutcome } from "./types.js";

const JUDGE_SYSTEM =
  "You are a strict evaluator. Given a CRITERION and a MODEL RESPONSE, decide whether " +
  "the response satisfies the criterion. Reply with a single line beginning with PASS " +
  "or FAIL, then a brief reason.";

export interface JudgeOptions {
  provider: string;
  model: string;
  runOptions: RunOptions;
}

export function parseVerdict(text: string): boolean | null {
  const m = text.match(/\b(PASS|FAIL)\b/i);
  if (!m) return null;
  return m[1]!.toUpperCase() === "PASS";
}

export async function judge(
  criterion: string,
  response: string,
  opts: JudgeOptions
): Promise<MatchOutcome> {
  const adapter = getAdapter(opts.provider);
  const messages = [
    { role: "system" as const, content: JUDGE_SYSTEM },
    {
      role: "user" as const,
      content: `CRITERION:\n${criterion}\n\nMODEL RESPONSE:\n${response}\n\nVerdict:`,
    },
  ];
  const result = await adapter.generate(
    messages,
    { model: opts.model, provider: opts.provider, params: {} },
    opts.runOptions
  );
  const firstLine = result.text.trim().split("\n")[0] ?? "";
  const verdict = parseVerdict(result.text);
  if (verdict === null) {
    return { pass: false, detail: `judge returned no PASS/FAIL verdict: "${firstLine}"` };
  }
  return { pass: verdict, detail: firstLine };
}
