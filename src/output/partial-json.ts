export function parsePartial(text: string): unknown | undefined {
  const start = text.indexOf("{");
  if (start === -1) return undefined;
  const s = text.slice(start);
  // Try progressively shorter prefixes, closing open structures, until one parses.
  for (let end = s.length; end > 0; end--) {
    try {
      return JSON.parse(closeOpen(s.slice(0, end)));
    } catch {
      // keep trimming
    }
  }
  return undefined;
}

function closeOpen(s: string): string {
  const stack: string[] = [];
  let inString = false;
  let escape = false;
  for (const ch of s) {
    if (inString) {
      if (escape) escape = false;
      else if (ch === "\\") escape = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") stack.pop();
  }
  let out = s;
  if (inString) out += '"';
  out = out.replace(/[,:]\s*$/, "");
  for (let i = stack.length - 1; i >= 0; i--) out += stack[i] === "{" ? "}" : "]";
  return out;
}
