// Prompt checks shared by the UserPromptSubmit hooks.

export const PLAN_RE = /(^|\s)#plan\b/;
export const NOPLAN_RE = /(^|\s)#noplan\b/;

// True for slash commands and `!` shell prompts, which the end-of-task and plan-mode hooks leave alone.
export const isSkippedPrompt = (prompt) => /^\s*[/!]/.test(prompt);
