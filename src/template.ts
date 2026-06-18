const VAR_RE = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

export function extractVars(text: string): string[] {
  const vars = new Set<string>();
  let match: RegExpExecArray | null;
  VAR_RE.lastIndex = 0;
  while ((match = VAR_RE.exec(text)) !== null) {
    vars.add(match[1]!);
  }
  return [...vars];
}

export function substitute(text: string, inputs: Record<string, unknown>): string {
  return text.replace(VAR_RE, (_full, name: string) => {
    const value = inputs[name];
    return value === undefined || value === null ? "" : String(value);
  });
}
