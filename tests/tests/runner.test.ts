import { describe, it, expect, beforeAll } from "vitest";
import { runTests } from "../../src/tests/runner.js";
import { parsePrompt } from "../../src/prompt.js";
import { registerAdapter } from "../../src/providers/registry.js";

beforeAll(() => {
  registerAdapter({
    name: "runstub",
    async generate(messages) {
      const last = messages[messages.length - 1]!.content;
      if (last.includes("Verdict:")) {
        return {
          text: last.includes("should pass") ? "PASS ok" : "FAIL no",
          raw: null,
          model: "m",
          provider: "runstub",
        };
      }
      return { text: "Hello Kunal, sure thing!", raw: null, model: "m", provider: "runstub" };
    },
  });
});

function prompt(testsYaml: string) {
  return parsePrompt(
    `---\nmodel: m\nprovider: runstub\ninput:\n  name: string\ntests:\n${testsYaml}\n---\n<user>\nHi {{name}}\n</user>\n`
  );
}

describe("runTests", () => {
  it("runs render-only tests with no API key and reports pass/fail", async () => {
    const p = prompt(
      "  - name: ok\n    input: { name: Kunal }\n    assert:\n      - rendered_contains: \"Hi\"\n" +
      "  - name: bad\n    input: { name: Kunal }\n    assert:\n      - rendered_contains: \"Bye\"\n"
    );
    const report = await runTests(p, {});
    expect(report.passed).toBe(1);
    expect(report.failed).toBe(1);
    expect(report.skipped).toBe(0);
  });

  it("skips live tests when no key is available", async () => {
    const p = prompt(
      "  - name: live\n    input: { name: Kunal }\n    assert:\n      - response_contains: \"Hello\"\n"
    );
    const report = await runTests(p, {});
    expect(report.skipped).toBe(1);
    expect(report.results[0]!.skipReason).toContain("no API key");
  });

  it("fails (not skips) live tests with --require-live when no key", async () => {
    const p = prompt(
      "  - name: live\n    input: { name: Kunal }\n    assert:\n      - response_contains: \"Hello\"\n"
    );
    const report = await runTests(p, { requireLive: true });
    expect(report.failed).toBe(1);
    expect(report.skipped).toBe(0);
  });

  it("skips live tests under --render-only even when a key is present", async () => {
    const p = prompt(
      "  - name: live\n    input: { name: Kunal }\n    assert:\n      - response_contains: \"Hello\"\n"
    );
    const report = await runTests(p, { renderOnly: true, runOptions: { apiKey: "x" } });
    expect(report.skipped).toBe(1);
  });

  it("runs live response_* and judge assertions when a key is present", async () => {
    const p = prompt(
      "  - name: live ok\n    input: { name: Kunal }\n    assert:\n" +
      "      - response_contains: \"Hello\"\n" +
      "      - response_not_contains: \"sure thing\"\n" +
      "      - judge: \"should pass\"\n"
    );
    const report = await runTests(p, { runOptions: { apiKey: "x" } });
    const r = report.results[0]!;
    expect(r.status).toBe("failed");
    expect(r.assertions.map((a) => a.pass)).toEqual([true, false, true]);
  });

  it("fails a test whose input violates the schema, without aborting others", async () => {
    const p = prompt(
      "  - name: bad input\n    input: {}\n    assert:\n      - rendered_contains: \"Hi\"\n" +
      "  - name: good\n    input: { name: Kunal }\n    assert:\n      - rendered_contains: \"Hi\"\n"
    );
    const report = await runTests(p, {});
    expect(report.failed).toBe(1);
    expect(report.passed).toBe(1);
    expect(report.results[0]!.assertions[0]!.detail).toContain("Missing required input");
  });
});
