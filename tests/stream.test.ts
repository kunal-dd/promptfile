import { describe, it, expect } from "vitest";
import { StructuredStream } from "../src/output/stream.js";
import type { OutputSchema } from "../src/output/types.js";

async function* chunks(parts: string[]) {
  for (const p of parts) yield p;
}

const schema: OutputSchema = {
  kind: "object",
  fields: [{ name: "title", required: true, schema: { kind: "string" } }],
};

describe("StructuredStream", () => {
  it("yields growing partial objects and resolves complete (with schema)", async () => {
    const stream = new StructuredStream(
      chunks(['{"tit', 'le":"Hel', 'lo"}']),
      schema,
      async (full) => ({ data: { title: "Hello" }, text: full })
    );
    const seen: unknown[] = [];
    for await (const partial of stream) seen.push(partial);
    expect(seen[seen.length - 1]).toEqual({ title: "Hello" });
    expect(await stream.complete).toEqual({ data: { title: "Hello" }, text: '{"title":"Hello"}' });
  });

  it("yields raw text when there is no schema", async () => {
    const stream = new StructuredStream(chunks(["Hel", "lo"]), undefined, async (full) => ({
      data: undefined,
      text: full,
    }));
    const seen: unknown[] = [];
    for await (const t of stream) seen.push(t);
    expect(seen).toEqual(["Hel", "Hello"]);
    expect(await stream.complete).toEqual({ data: undefined, text: "Hello" });
  });

  it("complete works even without iterating", async () => {
    const stream = new StructuredStream(chunks(["x", "y"]), undefined, async (full) => ({
      data: undefined,
      text: full,
    }));
    expect(await stream.complete).toEqual({ data: undefined, text: "xy" });
  });

  it("rejects complete and throws from the iterator when the source errors", async () => {
    async function* boom() {
      yield "{";
      throw new Error("stream broke");
    }
    const stream = new StructuredStream(boom(), schema, async (full) => ({ data: {}, text: full }));
    await expect(stream.complete).rejects.toThrow("stream broke");
  });
});
