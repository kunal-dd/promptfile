import { describe, it, expect } from "vitest";
import { parsePartial } from "../../src/output/partial-json.js";

describe("parsePartial", () => {
  it("returns undefined before any object starts", () => {
    expect(parsePartial("Sure, here")).toBe(undefined);
  });
  it("parses a complete object", () => {
    expect(parsePartial('{"a":1,"b":2}')).toEqual({ a: 1, b: 2 });
  });
  it("closes an open object", () => {
    expect(parsePartial('{"a":1,"b":2')).toEqual({ a: 1, b: 2 });
  });
  it("drops a dangling key with no value", () => {
    expect(parsePartial('{"a":1,"b":')).toEqual({ a: 1 });
  });
  it("closes an open string mid-value", () => {
    expect(parsePartial('{"a":"hel')).toEqual({ a: "hel" });
  });
  it("closes nested arrays and objects", () => {
    expect(parsePartial('{"a":[1,2,{"b":"x')).toEqual({ a: [1, 2, { b: "x" }] });
  });
  it("handles a trailing backslash at the truncation boundary", () => {
    expect(parsePartial('{"a":"x\\')).toEqual({ a: "x" });
  });
  it("never throws and is monotonic over growing prefixes", () => {
    const full = '{"title":"Hello","tags":["a","b"],"n":3}';
    let last: unknown = undefined;
    for (let i = 1; i <= full.length; i++) {
      const v = parsePartial(full.slice(0, i));
      expect(() => JSON.stringify(v)).not.toThrow();
      last = v;
    }
    expect(last).toEqual({ title: "Hello", tags: ["a", "b"], n: 3 });
  });
});
