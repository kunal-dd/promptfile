export function extractJson(text: string): string | null {
  const trimmed = text.trim();
  // Prefer fenced content, but fall back to the raw text when the fence body
  // doesn't yield a balanced object — e.g. a JSON string value contains ``` itself,
  // which the non-greedy fence match would truncate.
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence) {
    const fromFence = scanBalanced(fence[1]!.trim());
    if (fromFence !== null) return fromFence;
  }
  return scanBalanced(trimmed);
}

// Returns the first balanced { ... } object in s (string/escape aware), or null.
function scanBalanced(s: string): string | null {
  const start = s.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i]!;
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}
