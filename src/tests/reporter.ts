import type { TestReport } from "./types.js";

export function formatReport(report: TestReport): string {
  const lines: string[] = [];
  for (const r of report.results) {
    if (r.status === "passed") {
      lines.push(`✓ ${r.name}`);
    } else if (r.status === "skipped") {
      lines.push(`- ${r.name} (skipped: ${r.skipReason ?? "n/a"})`);
    } else {
      lines.push(`✗ ${r.name}`);
      for (const a of r.assertions.filter((x) => !x.pass)) {
        lines.push(`    ${a.kind} ${JSON.stringify(a.value)}: ${a.detail}`);
      }
    }
  }
  lines.push("");
  lines.push(`${report.passed} passed, ${report.failed} failed, ${report.skipped} skipped`);
  return lines.join("\n");
}

export function exitCode(report: TestReport): number {
  return report.failed > 0 ? 1 : 0;
}

export function mergeReports(reports: TestReport[]): TestReport {
  return {
    results: reports.flatMap((r) => r.results),
    passed: reports.reduce((n, r) => n + r.passed, 0),
    failed: reports.reduce((n, r) => n + r.failed, 0),
    skipped: reports.reduce((n, r) => n + r.skipped, 0),
  };
}
