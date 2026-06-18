#!/usr/bin/env node
import { buildProgram } from "./cli-core.js";

buildProgram()
  .parseAsync()
  .catch((err: unknown) => {
    console.error(err instanceof Error ? err.message : String(err));
    process.exitCode = 1;
  });
