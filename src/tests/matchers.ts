import type { MatchOutcome } from "./types.js";

export function contains(target: string, value: string): MatchOutcome {
  const pass = target.includes(value);
  return { pass, detail: pass ? `found "${value}"` : `"${value}" not found in target` };
}

export function notContains(target: string, value: string): MatchOutcome {
  const found = target.includes(value);
  return {
    pass: !found,
    detail: found ? `found "${value}" but it should be absent` : `"${value}" correctly absent`,
  };
}

export function matches(target: string, value: string): MatchOutcome {
  let re: RegExp;
  try {
    // Support Python-style inline (?i) case-insensitive flag.
    let pattern = value;
    let flags = "";
    if (pattern.startsWith("(?i)")) {
      flags = "i";
      pattern = pattern.slice(4);
    }
    re = new RegExp(pattern, flags);
  } catch (e) {
    return { pass: false, detail: `invalid regex /${value}/: ${(e as Error).message}` };
  }
  const pass = re.test(target);
  return { pass, detail: pass ? `matched /${value}/` : `no match for /${value}/` };
}
