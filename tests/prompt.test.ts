import { describe, it, expect, beforeAll } from "vitest";
import { writeFile, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parsePrompt, loadPrompt, Prompt } from "../src/prompt.js";
import { registerAdapter } from "../src/providers/registry.js";

const SRC = `---
model: stub-model
provider: stubrun
input:
  name: string
---
<user>
Hi {{name}}
</user>
`;

beforeAll(() => {
  registerAdapter({
    name: "stubrun",
    async generate(messages) {
      return { text: `echo:${messages[0]!.content}`, raw: null, model: "stub-model", provider: "stubrun" };
    },
  });
});

describe("Prompt", () => {
  it("parsePrompt exposes config and inputs", () => {
    const p = parsePrompt(SRC);
    expect(p).toBeInstanceOf(Prompt);
    expect(p.config.provider).toBe("stubrun");
    expect(p.inputs).toEqual([{ name: "name", type: "string", required: true }]);
  });

  it("render fills the template", () => {
    expect(parsePrompt(SRC).render({ name: "Kunal" })).toEqual([
      { role: "user", content: "Hi Kunal" },
    ]);
  });

  it("run dispatches to the adapter", async () => {
    const result = await parsePrompt(SRC).run({ name: "Kunal" });
    expect(result.text).toBe("echo:Hi Kunal");
  });

  it("loadPrompt reads from disk", async () => {
    const dir = await mkdtemp(join(tmpdir(), "promptfile-"));
    const file = join(dir, "greeting.prompt");
    await writeFile(file, SRC, "utf8");
    const p = await loadPrompt(file);
    expect(p.render({ name: "Sam" })).toEqual([{ role: "user", content: "Hi Sam" }]);
  });
});
