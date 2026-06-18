import { describe, it, expect } from "vitest";
import { extractVars, substitute } from "../src/template.js";

describe("extractVars", () => {
  it("finds unique variable names", () => {
    expect(extractVars("Hi {{name}}, {{name}} and {{ tone }}")).toEqual(["name", "tone"]);
  });
  it("returns empty array when none", () => {
    expect(extractVars("no vars here")).toEqual([]);
  });
});

describe("substitute", () => {
  it("replaces declared vars and tolerates whitespace", () => {
    expect(substitute("Hi {{name}} ({{ tone }})", { name: "Kunal", tone: "warm" }))
      .toBe("Hi Kunal (warm)");
  });
  it("replaces missing vars with empty string", () => {
    expect(substitute("Hi {{name}}", {})).toBe("Hi ");
  });
  it("coerces non-string values", () => {
    expect(substitute("n={{n}} b={{b}}", { n: 42, b: true })).toBe("n=42 b=true");
  });
});
