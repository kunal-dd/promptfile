import { describe, it, expect } from "vitest";
import { contains, notContains, matches } from "../../src/tests/matchers.js";

describe("contains", () => {
  it("passes when the substring is present", () => {
    expect(contains("hello world", "world").pass).toBe(true);
  });
  it("fails when absent", () => {
    const o = contains("hello world", "bye");
    expect(o.pass).toBe(false);
    expect(o.detail).toContain("not found");
  });
});

describe("notContains", () => {
  it("passes when the substring is absent", () => {
    expect(notContains("hello", "bye").pass).toBe(true);
  });
  it("fails when present", () => {
    expect(notContains("hello", "ell").pass).toBe(false);
  });
});

describe("matches", () => {
  it("passes when the regex matches", () => {
    expect(matches("Error: 429", "(?i)\\d{3}").pass).toBe(true);
  });
  it("fails when the regex does not match", () => {
    expect(matches("ok", "\\d+").pass).toBe(false);
  });
  it("fails gracefully on an invalid regex (no throw)", () => {
    const o = matches("x", "(");
    expect(o.pass).toBe(false);
    expect(o.detail).toContain("invalid regex");
  });
});
