import { readFile, writeFile } from "node:fs/promises";
import { basename } from "node:path";
import { Command } from "commander";
import { loadPrompt } from "./prompt.js";
import { runTests } from "./tests/runner.js";
import { formatReport, exitCode, mergeReports } from "./tests/reporter.js";
import type { TestReport } from "./tests/types.js";
import type { Inputs, InputSpec } from "./types.js";
import { toTypeScript } from "./output/typegen.js";

function capitalizeFirstLetter(w: string): string {
  return w.replace(/[a-zA-Z]/, (c) => c.toUpperCase());
}

function pascalCase(stem: string): string {
  const name = stem
    .split(/[^a-zA-Z0-9]+/)
    .filter(Boolean)
    .map(capitalizeFirstLetter)
    .join("");
  if (name.length === 0) return "Output";
  return /^[0-9]/.test(name) ? `_${name}` : name;
}

export function collectVar(value: string, previous: Record<string, string>): Record<string, string> {
  const eq = value.indexOf("=");
  if (eq === -1) {
    throw new Error(`--var must be key=value, got '${value}'.`);
  }
  return { ...previous, [value.slice(0, eq)]: value.slice(eq + 1) };
}

/**
 * Coerce a single raw value to the type declared by its input spec. String
 * values (from `--var` or a string in a vars-file) are parsed; values that
 * already have the right primitive type (from JSON in a vars-file) pass through.
 */
export function coerceValue(
  spec: InputSpec | undefined,
  value: string | number | boolean,
  key: string
): string | number | boolean {
  if (!spec || typeof value !== "string") return value;
  switch (spec.type) {
    case "number": {
      const n = Number(value);
      if (Number.isNaN(n)) throw new Error(`Input '${key}' must be a number, got '${value}'.`);
      return n;
    }
    case "boolean":
      if (value === "true" || value === "1") return true;
      if (value === "false" || value === "0") return false;
      throw new Error(`Input '${key}' must be a boolean (true/false), got '${value}'.`);
    default:
      return value;
  }
}

export function coerceInputs(specs: InputSpec[], raw: Record<string, string>): Inputs {
  const byName = new Map(specs.map((s) => [s.name, s]));
  const out: Inputs = {};
  for (const [key, val] of Object.entries(raw)) {
    out[key] = coerceValue(byName.get(key), val, key);
  }
  return out;
}

async function resolveInputs(
  varsFile: string | undefined,
  vars: Record<string, string>,
  specs: InputSpec[]
): Promise<Inputs> {
  const byName = new Map(specs.map((s) => [s.name, s]));
  const merged: Record<string, string | number | boolean> = {};
  if (varsFile) {
    Object.assign(merged, JSON.parse(await readFile(varsFile, "utf8")) as Inputs);
  }
  Object.assign(merged, vars); // --var overrides vars-file
  const out: Inputs = {};
  for (const [key, val] of Object.entries(merged)) {
    out[key] = coerceValue(byName.get(key), val, key);
  }
  return out;
}

export function buildProgram(): Command {
  const program = new Command();
  program.name("promptfile").description("Run and render .prompt files.").version("0.4.0");

  program
    .command("render")
    .argument("<file>", "path to a .prompt file")
    .option("-v, --var <key=value>", "set an input variable (repeatable)", collectVar, {})
    .option("--vars-file <path>", "JSON file of input variables")
    .action(async (file: string, options: { var: Record<string, string>; varsFile?: string }) => {
      const prompt = await loadPrompt(file);
      const inputs = await resolveInputs(options.varsFile, options.var, prompt.inputs);
      console.log(JSON.stringify(prompt.render(inputs), null, 2));
    });

  program
    .command("run")
    .argument("<file>", "path to a .prompt file")
    .option("-v, --var <key=value>", "set an input variable (repeatable)", collectVar, {})
    .option("--vars-file <path>", "JSON file of input variables")
    .action(async (file: string, options: { var: Record<string, string>; varsFile?: string }) => {
      const prompt = await loadPrompt(file);
      const inputs = await resolveInputs(options.varsFile, options.var, prompt.inputs);
      const result = await prompt.run(inputs);
      if (result.data !== undefined) {
        console.log(JSON.stringify(result.data, null, 2));
      } else {
        console.log(result.text);
      }
    });

  program
    .command("test")
    .argument("<files...>", "one or more .prompt files to test")
    .option("--render-only", "run deterministic render tests only (no API calls)")
    .option("--require-live", "fail (instead of skip) live tests when no API key is available")
    .action(
      async (files: string[], options: { renderOnly?: boolean; requireLive?: boolean }) => {
        const reports: TestReport[] = [];
        for (const file of files) {
          const prompt = await loadPrompt(file);
          reports.push(
            await runTests(prompt, {
              renderOnly: options.renderOnly,
              requireLive: options.requireLive,
            })
          );
        }
        const merged = mergeReports(reports);
        console.log(formatReport(merged));
        process.exitCode = exitCode(merged);
      }
    );

  program
    .command("types")
    .argument("<files...>", "one or more .prompt files")
    .option("-o, --out <file>", "write generated types to a file instead of stdout")
    .action(async (files: string[], options: { out?: string }) => {
      const blocks: string[] = [];
      for (const file of files) {
        const prompt = await loadPrompt(file);
        if (!prompt.output) {
          console.error(`skipped ${file}: no output schema`);
          continue;
        }
        const stem = basename(file).replace(/\.prompt$/, "");
        blocks.push(toTypeScript(prompt.output, pascalCase(stem)));
      }
      if (blocks.length === 0) {
        console.error("No output schemas found.");
        process.exitCode = 1;
        return;
      }
      const content = `// generated by promptfile\n\n${blocks.join("\n")}`;
      if (options.out) {
        await writeFile(options.out, content, "utf8");
      } else {
        console.log(content);
      }
    });

  return program;
}
