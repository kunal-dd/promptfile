import { getAdapter } from "../providers/registry.js";
import { contains, notContains, matches } from "./matchers.js";
import { judge } from "./judge.js";
import type { Prompt } from "../prompt.js";
import type { RunOptions, RunResult } from "../types.js";
import type {
  Assertion,
  AssertionResult,
  MatchOutcome,
  TestCase,
  TestReport,
  TestResult,
} from "./types.js";

const ENV_KEYS: Record<string, string> = {
  anthropic: "ANTHROPIC_API_KEY",
  openai: "OPENAI_API_KEY",
};

export interface RunnerOptions {
  renderOnly?: boolean;
  requireLive?: boolean;
  runOptions?: RunOptions;
}

export async function runTests(prompt: Prompt, opts: RunnerOptions = {}): Promise<TestReport> {
  const results: TestResult[] = [];
  for (const test of prompt.tests) {
    results.push(await runOne(prompt, test, opts));
  }
  let passed = 0;
  let failed = 0;
  let skipped = 0;
  for (const r of results) {
    if (r.status === "passed") passed++;
    else if (r.status === "failed") failed++;
    else skipped++;
  }
  return { results, passed, failed, skipped };
}

function hasKey(provider: string, runOptions?: RunOptions): boolean {
  if (runOptions?.apiKey) return true;
  const envName = ENV_KEYS[provider];
  return envName ? Boolean(process.env[envName]) : false;
}

function toResult(a: Assertion, o: MatchOutcome): AssertionResult {
  return { kind: a.kind, value: a.value, pass: o.pass, detail: o.detail };
}

async function runOne(prompt: Prompt, test: TestCase, opts: RunnerOptions): Promise<TestResult> {
  let messages;
  try {
    messages = prompt.render(test.input);
  } catch (e) {
    return {
      name: test.name,
      status: "failed",
      assertions: [{ kind: "input", value: "", pass: false, detail: (e as Error).message }],
    };
  }
  const rendered = messages.map((m) => `${m.role}: ${m.content}`).join("\n");

  if (test.live) {
    if (opts.renderOnly) {
      return { name: test.name, status: "skipped", assertions: [], skipReason: "--render-only" };
    }
    if (!hasKey(prompt.config.provider, opts.runOptions)) {
      if (opts.requireLive) {
        return {
          name: test.name,
          status: "failed",
          assertions: [
            {
              kind: "live",
              value: "",
              pass: false,
              detail: `no API key for provider '${prompt.config.provider}' (--require-live)`,
            },
          ],
        };
      }
      return {
        name: test.name,
        status: "skipped",
        assertions: [],
        skipReason: `no API key for provider '${prompt.config.provider}'`,
      };
    }
  }

  let response: string | null = null;
  if (test.live) {
    try {
      const adapter = getAdapter(prompt.config.provider);
      const result: RunResult = await adapter.generate(messages, prompt.config, opts.runOptions ?? {});
      response = result.text;
    } catch (e) {
      return {
        name: test.name,
        status: "failed",
        assertions: [{ kind: "provider", value: "", pass: false, detail: (e as Error).message }],
      };
    }
  }

  const assertions: AssertionResult[] = [];
  for (const a of test.assert) {
    assertions.push(await evaluate(a, rendered, response, prompt, test, opts));
  }
  const status = assertions.every((r) => r.pass) ? "passed" : "failed";
  return { name: test.name, status, assertions };
}

async function evaluate(
  a: Assertion,
  rendered: string,
  response: string | null,
  prompt: Prompt,
  test: TestCase,
  opts: RunnerOptions
): Promise<AssertionResult> {
  switch (a.kind) {
    case "rendered_contains":
      return toResult(a, contains(rendered, a.value));
    case "rendered_not_contains":
      return toResult(a, notContains(rendered, a.value));
    case "rendered_matches":
      return toResult(a, matches(rendered, a.value));
    case "response_contains":
      return toResult(a, contains(response ?? "", a.value));
    case "response_not_contains":
      return toResult(a, notContains(response ?? "", a.value));
    case "response_matches":
      return toResult(a, matches(response ?? "", a.value));
    case "judge":
      return toResult(
        a,
        await judge(a.value, response ?? "", {
          provider: test.judgeProvider ?? prompt.config.provider,
          model: test.judgeModel ?? prompt.config.model,
          runOptions: opts.runOptions ?? {},
        })
      );
  }
}
