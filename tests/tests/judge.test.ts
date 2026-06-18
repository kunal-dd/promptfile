import { describe, it, expect, beforeAll } from "vitest";
import { judge, parseVerdict } from "../../src/tests/judge.js";
import { registerAdapter } from "../../src/providers/registry.js";

beforeAll(() => {
  registerAdapter({
    name: "judgestub",
    async generate(messages) {
      const user = messages[messages.length - 1]!.content;
      if (user.includes("VERDICT_PASS")) return { text: "PASS looks good", raw: null, model: "m", provider: "judgestub" };
      if (user.includes("VERDICT_FAIL")) return { text: "FAIL not acceptable", raw: null, model: "m", provider: "judgestub" };
      return { text: "hmm, unclear", raw: null, model: "m", provider: "judgestub" };
    },
  });
});

describe("parseVerdict", () => {
  it("reads PASS/FAIL case-insensitively", () => {
    expect(parseVerdict("pass: ok")).toBe(true);
    expect(parseVerdict("FAIL — nope")).toBe(false);
  });
  it("returns null when neither token is present", () => {
    expect(parseVerdict("maybe")).toBe(null);
  });
});

describe("judge", () => {
  const opts = { provider: "judgestub", model: "m", runOptions: {} };

  it("passes when the judge says PASS", async () => {
    const o = await judge("VERDICT_PASS", "some response", opts);
    expect(o.pass).toBe(true);
  });
  it("fails when the judge says FAIL", async () => {
    const o = await judge("VERDICT_FAIL", "some response", opts);
    expect(o.pass).toBe(false);
  });
  it("fails with the raw reply when no verdict is present", async () => {
    const o = await judge("ambiguous", "some response", opts);
    expect(o.pass).toBe(false);
    expect(o.detail).toContain("no PASS/FAIL");
  });
});
