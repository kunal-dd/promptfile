import { describe, it, expect, vi } from "vitest";
import { coerce } from "../../src/output/repair.js";
import { OutputParseError, OutputValidationError } from "../../src/errors.js";
import type { OutputSchema } from "../../src/output/types.js";

const schema: OutputSchema = {
  kind: "object",
  fields: [{ name: "title", required: true, schema: { kind: "string" } }],
};

describe("coerce", () => {
  it("returns validated data from clean JSON without re-asking", async () => {
    const reAsk = vi.fn();
    const { data, text } = await coerce('{"title":"Hi"}', schema, reAsk, 1);
    expect(data).toEqual({ title: "Hi" });
    expect(text).toBe('{"title":"Hi"}');
    expect(reAsk).not.toHaveBeenCalled();
  });

  it("extracts JSON from fences/prose without re-asking", async () => {
    const reAsk = vi.fn();
    const { data } = await coerce('Here:\n```json\n{"title":"Hi"}\n```', schema, reAsk, 1);
    expect(data).toEqual({ title: "Hi" });
    expect(reAsk).not.toHaveBeenCalled();
  });

  it("re-asks once on a validation error, then succeeds", async () => {
    const reAsk = vi.fn().mockResolvedValue('{"title":"Fixed"}');
    const { data } = await coerce('{"title":123}', schema, reAsk, 1);
    expect(data).toEqual({ title: "Fixed" });
    expect(reAsk).toHaveBeenCalledTimes(1);
    expect(reAsk.mock.calls[0][1]).toContain("title: expected string, got number");
  });

  it("throws OutputValidationError after exhausting repairs", async () => {
    const reAsk = vi.fn().mockResolvedValue('{"title":123}');
    await expect(coerce('{"title":123}', schema, reAsk, 1)).rejects.toBeInstanceOf(OutputValidationError);
    expect(reAsk).toHaveBeenCalledTimes(1);
  });

  it("throws OutputParseError when no JSON is ever produced", async () => {
    const reAsk = vi.fn().mockResolvedValue("still no json");
    await expect(coerce("no json", schema, reAsk, 1)).rejects.toBeInstanceOf(OutputParseError);
  });

  it("does not re-ask when maxRepairs is 0", async () => {
    const reAsk = vi.fn();
    await expect(coerce('{"title":1}', schema, reAsk, 0)).rejects.toBeInstanceOf(OutputValidationError);
    expect(reAsk).not.toHaveBeenCalled();
  });
});
