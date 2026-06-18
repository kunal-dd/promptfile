import { describe, it, expect } from "vitest";
import { parseTests } from "../../src/tests/parse-tests.js";
import { PromptParseError } from "../../src/errors.js";

describe("parseTests", () => {
  it("returns [] when there is no tests block", () => {
    expect(parseTests(undefined)).toEqual([]);
  });

  it("parses a render-only test", () => {
    const out = parseTests([
      { name: "t1", input: { name: "Kunal" }, assert: [{ rendered_contains: "hi" }] },
    ]);
    expect(out).toEqual([
      {
        name: "t1",
        input: { name: "Kunal" },
        assert: [{ kind: "rendered_contains", value: "hi" }],
        live: false,
      },
    ]);
  });

  it("marks a test live when it has a response_* or judge assertion, and reads judge overrides", () => {
    const out = parseTests([
      {
        name: "t2",
        assert: [{ response_contains: "ok" }, { judge: "is polite" }],
        judge_model: "claude-haiku-4-5",
        judge_provider: "anthropic",
      },
    ]);
    expect(out[0]!.live).toBe(true);
    expect(out[0]!.input).toEqual({});
    expect(out[0]!.judgeModel).toBe("claude-haiku-4-5");
    expect(out[0]!.judgeProvider).toBe("anthropic");
  });

  it("throws when tests is not a list", () => {
    expect(() => parseTests({})).toThrow(/must be a list/);
  });
  it("throws when a test is missing a name", () => {
    expect(() => parseTests([{ assert: [{ rendered_contains: "x" }] }])).toThrow(/missing a 'name'/);
  });
  it("throws when assert is empty", () => {
    expect(() => parseTests([{ name: "t", assert: [] }])).toThrow(/non-empty 'assert'/);
  });
  it("throws on an unknown matcher key", () => {
    expect(() => parseTests([{ name: "t", assert: [{ bogus: "x" }] }])).toThrow(/unknown matcher 'bogus'/);
  });
  it("throws when an assertion has multiple keys", () => {
    expect(() => parseTests([{ name: "t", assert: [{ rendered_contains: "a", judge: "b" }] }]))
      .toThrow(/exactly one matcher key/);
  });
  it("throws when a matcher value is not a string", () => {
    expect(() => parseTests([{ name: "t", assert: [{ rendered_contains: 5 }] }]))
      .toThrow(/must have a string value/);
  });
});
