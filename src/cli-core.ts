import { readFile } from "node:fs/promises";
import { Command } from "commander";
import { loadPrompt } from "./prompt.js";
import type { Inputs, InputSpec } from "./types.js";

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
  program.name("promptfile").description("Run and render .prompt files.").version("0.1.0");

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
      console.log(result.text);
    });

  return program;
}
