import { substitute } from "./template.js";
import { validateInputs } from "./validator.js";
import type { Inputs, Message, PromptAST } from "./types.js";

export function renderMessages(ast: PromptAST, inputs: Inputs): Message[] {
  validateInputs(ast, inputs);
  return ast.messages.map((msg) => ({
    role: msg.role,
    content: substitute(msg.content, inputs),
  }));
}
