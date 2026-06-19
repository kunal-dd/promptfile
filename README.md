# promptfile

[![CI](https://github.com/kunal-dd/promptfile/actions/workflows/ci.yml/badge.svg)](https://github.com/kunal-dd/promptfile/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/promptfile.svg)](https://www.npmjs.com/package/promptfile)
[![license](https://img.shields.io/npm/l/promptfile.svg)](./LICENSE)

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

## Testing prompts

Add a `tests:` block to your `.prompt` file and catch prompt regressions in CI.
Tests come in two flavors:

- **Render tests** — deterministic, no API call. Assert on the rendered messages.
- **Live tests** — call the provider and assert on the response, including an
  `llm_judge` criterion graded by a model.

```
---
model: claude-opus-4-8
provider: anthropic
input:
  name: string
  tone: string
tests:
  - name: includes the safety clause
    input: { name: Kunal, tone: rude }
    assert:
      - rendered_contains: "be respectful"        # deterministic, no API call

  - name: declines rude requests
    input: { name: Kunal, tone: rude }
    assert:
      - response_not_contains: "sure thing"        # live: checks the model reply
      - response_matches: "(?i)sorry|can't"
      - judge: "the reply politely declines the rude request"   # live: llm_judge
---
<system>Be respectful and {{tone}}-aware.</system>
<user>Greet {{name}}.</user>
```

Matchers: `rendered_contains` / `rendered_not_contains` / `rendered_matches`
(deterministic), and `response_contains` / `response_not_contains` /
`response_matches` / `judge` (live). A test is **live** if it has any
`response_*` or `judge` assertion. `judge` reuses the prompt's model by default;
override per-test with `judge_model` / `judge_provider`.

Run them:

```bash
# Render tests always run; live tests run when an API key is present,
# and are skipped otherwise. Exit code is 1 if any test fails.
promptfile test greeting.prompt

# Skip live tests even if a key exists (fast, free, deterministic).
promptfile test greeting.prompt --render-only

# Fail (instead of skip) live tests when no key is available.
promptfile test greeting.prompt --require-live
```

## Use in CI

The deterministic suite needs no secrets, so it makes a clean merge gate:

```yaml
- uses: kunal-dd/promptfile@v2
  with:
    files: "prompts/**/*.prompt"
    render-only: "true"   # set false + provide provider keys to run live tests
```

## Structured output

Declare an `output:` schema and `run()` returns validated, typed data — not just
text. The runtime instructs the model to emit matching JSON, then extracts,
validates, and repairs it (one corrective re-ask by default).

```
---
model: claude-opus-4-8
provider: anthropic
input:
  text: string
output:
  title: string
  sentiment: enum(positive, neutral, negative)
  topics: string[]
  author:
    name: string
    handle?: string
---
<user>{{text}}</user>
```

Schema types: `string`, `number`, `boolean`, `enum(a, b, c)`, arrays (`string[]`),
nested objects (indent), and optional fields (`name?`). Arrays hold scalars/enums
in this release.

```ts
const result = await prompt.run({ text: "..." });
result.data;  // { title, sentiment, topics, author } — validated
result.text;  // the raw model output

// Stream it: partial objects as they arrive, plus a validated final result.
const stream = prompt.stream({ text: "..." });
for await (const partial of stream) console.log(partial);
const { data } = await stream.complete;
```

`run(inputs, { repair })` sets the max corrective re-asks (default `1`, `0` to
disable). On unrecoverable output you get an `OutputValidationError` (with the
per-field errors) or `OutputParseError`.

## Providers

Anthropic and OpenAI are built in. Add your own with `registerAdapter`.

## License

MIT
