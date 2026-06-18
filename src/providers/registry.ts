import { ProviderError } from "../errors.js";
import { anthropicAdapter } from "./anthropic.js";
import { openaiAdapter } from "./openai.js";
import type { ProviderAdapter } from "./types.js";

const adapters = new Map<string, ProviderAdapter>([
  [anthropicAdapter.name, anthropicAdapter],
  [openaiAdapter.name, openaiAdapter],
]);

export function getAdapter(name: string): ProviderAdapter {
  const adapter = adapters.get(name);
  if (!adapter) {
    throw new ProviderError(
      `Unknown provider '${name}'. Supported: ${[...adapters.keys()].join(", ")}.`
    );
  }
  return adapter;
}

export function registerAdapter(adapter: ProviderAdapter): void {
  adapters.set(adapter.name, adapter);
}
