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

export function coerceInputs(specs: InputSpec[], raw: Record<string, string>): Inputs {
  const byName = new Map(specs.map((s) => [s.name, s]));
  const out: Inputs = {};
  for (const [key, val] of Object.entries(raw)) {
    const spec = byName.get(key);
    if (!spec) {
      out[key] = val;
      continue;
    }
    switch (spec.type) {
      case "number": {
        const n = Number(val);
        if (Number.isNaN(n)) throw new Error(`Input '${key}' must be a number, got '${val}'.`);
        out[key] = n;
        break;
      }
      case "boolean":
        out[key] = val === "true" || val === "1";
        break;
      default:
        out[key] = val;
    }
  }
  return out;
}

async function resolveInputs(
  varsFile: string | undefined,
  vars: Record<string, string>,
  specs: InputSpec[]
): Promise<Inputs> {
  let base: Inputs = {};
  if (varsFile) {
    base = JSON.parse(await readFile(varsFile, "utf8")) as Inputs;
  }
  return { ...base, ...coerceInputs(specs, vars) };
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
