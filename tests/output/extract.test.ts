import { describe, it, expect } from "vitest";
import { extractJson } from "../../src/output/extract.js";

describe("extractJson", () => {
  it("returns bare JSON unchanged", () => {
    expect(extractJson('{"a":1}')).toBe('{"a":1}');
  });
  it("strips ```json fences", () => {
    expect(extractJson('```json\n{"a":1}\n```')).toBe('{"a":1}');
  });
  it("pulls the object out of surrounding prose", () => {
    expect(extractJson('Sure! Here you go: {"a":1} — hope that helps')).toBe('{"a":1}');
  });
  it("handles braces inside strings", () => {
    expect(extractJson('{"a":"}{"}' )).toBe('{"a":"}{"}');
  });
  it("returns null when there is no object", () => {
    expect(extractJson("no json here")).toBe(null);
  });
  it("falls back to raw scan when fenced JSON contains ``` inside a string", () => {
    expect(extractJson('```json\n{"code":"```py"}\n```')).toBe('{"code":"```py"}');
  });
});
