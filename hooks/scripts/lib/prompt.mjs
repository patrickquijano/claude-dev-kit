// Prompt checks shared by the UserPromptSubmit hooks.

export const PLAN_RE = /(^|\s)#plan\b/;
export const NOPLAN_RE = /(^|\s)#noplan\b/;

// True for built-in slash commands and `!` shell prompts, which the plan-mode hook leaves alone; `/<plugin>:<skill>` is gated.
export const isSkippedPrompt = (prompt) => /^\s*(!|\/(?![\w.-]+:[\w.-]))/.test(prompt);

// Turns the harness starts itself (background-agent reports, cross-agent messages); the prompt hooks never act on these.
const MACHINE_PREFIXES = ['<task-notification>', '<agent-message'];
export const isMachinePrompt = (prompt) => MACHINE_PREFIXES.some((p) => prompt.trimStart().startsWith(p));
