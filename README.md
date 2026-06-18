# promptfile

A single-file format and runtime for LLM prompts. Write a `.prompt` file once —
versioned, provider-portable, separated from your app code — then render or run it.

## Install

```bash
npm install promptfile
```

## The format

```
---
model: claude-opus-4-8
provider: anthropic
temperature: 0.7
input:
  name: string
  tone?: string
---
<system>
You are a friendly assistant.
</system>

<user>
Write a {{tone}} greeting for {{name}}.
</user>
```

- YAML frontmatter for config (`model`, `provider`, params, `input` schema).
- Body with `<system>` / `<user>` / `<assistant>` blocks. No blocks = one user message.
- `{{variable}}` substitution. Add `?` to an input name to make it optional.

## Library

```ts
import { loadPrompt } from "promptfile";

const greeting = await loadPrompt("./greeting.prompt");

// Pure: fill the template, no network call.
const messages = greeting.render({ name: "Kunal", tone: "warm" });

// Fill + call the provider (key from ANTHROPIC_API_KEY / OPENAI_API_KEY by default).
const result = await greeting.run({ name: "Kunal", tone: "warm" });
console.log(result.text);
```

## CLI

```bash
# Dry-run: print the resolved messages (no API call).
promptfile render greeting.prompt --var name=Kunal --var tone=warm

# Run against the configured provider.
promptfile run greeting.prompt --var name=Kunal --var tone=warm
```

## Providers

Anthropic and OpenAI are built in. Add your own with `registerAdapter`.

## License

MIT
