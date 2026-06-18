import { describe, it, expect } from "vitest";
import { formatReport, exitCode, mergeReports } from "../../src/tests/reporter.js";
import type { TestReport } from "../../src/tests/types.js";

const report: TestReport = {
  results: [
    { name: "a", status: "passed", assertions: [] },
    {
      name: "b",
      status: "failed",
      assertions: [{ kind: "response_contains", value: "x", pass: false, detail: "\"x\" not found in target" }],
    },
    { name: "c", status: "skipped", assertions: [], skipReason: "no API key for provider 'anthropic'" },
  ],
  passed: 1,
  failed: 1,
  skipped: 1,
};

describe("formatReport", () => {
  it("renders per-test lines and a summary", () => {
    const out = formatReport(report);
    expect(out).toContain("✓ a");
    expect(out).toContain("✗ b");
    expect(out).toContain('response_contains "x": "x" not found in target');
    expect(out).toContain("- c (skipped: no API key for provider 'anthropic')");
    expect(out).toContain("1 passed, 1 failed, 1 skipped");
  });
});

describe("exitCode", () => {
  it("is 1 when any test failed", () => {
    expect(exitCode(report)).toBe(1);
  });
  it("is 0 when nothing failed", () => {
    expect(exitCode({ results: [], passed: 2, failed: 0, skipped: 3 })).toBe(0);
  });
});

describe("mergeReports", () => {
  it("concatenates results and sums counts", () => {
    const merged = mergeReports([
      { results: [{ name: "a", status: "passed", assertions: [] }], passed: 1, failed: 0, skipped: 0 },
      { results: [{ name: "b", status: "failed", assertions: [] }], passed: 0, failed: 1, skipped: 0 },
    ]);
    expect(merged.results).toHaveLength(2);
    expect(merged).toMatchObject({ passed: 1, failed: 1, skipped: 0 });
  });
});
