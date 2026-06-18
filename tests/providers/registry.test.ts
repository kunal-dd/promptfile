import { describe, it, expect } from "vitest";
import { getAdapter, registerAdapter } from "../../src/providers/registry.js";
import { ProviderError } from "../../src/errors.js";
import type { ProviderAdapter } from "../../src/providers/types.js";

describe("registry", () => {
  it("returns built-in adapters by name", () => {
    expect(getAdapter("anthropic").name).toBe("anthropic");
    expect(getAdapter("openai").name).toBe("openai");
  });

  it("throws ProviderError listing supported providers for unknown names", () => {
    expect(() => getAdapter("nope")).toThrow(/Unknown provider 'nope'/);
  });

  it("allows registering a custom adapter", () => {
    const stub: ProviderAdapter = {
      name: "stub",
      async generate() {
        return { text: "stubbed", raw: null, model: "m", provider: "stub" };
      },
    };
    registerAdapter(stub);
    expect(getAdapter("stub")).toBe(stub);
  });
});
