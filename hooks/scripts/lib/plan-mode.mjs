// Plan-mode logic for the UserPromptSubmit dispatcher (user-prompt-submit.mjs): ask Claude to ask the user about plan
// mode, with the recommendation weighed against the context Claude sees, or to leave plan mode on #noplan.
// Hooks cannot change the mode themselves.
import { contextOutput } from './hook-io.mjs';
import { NOPLAN_RE, PLAN_RE, isSkippedPrompt } from './prompt.mjs';

const MODES = ['default', 'plan', 'acceptEdits', 'auto', 'dontAsk', 'bypassPermissions'];
// Turns the harness starts itself (background-agent reports, cross-agent messages); never ask on these.
const MACHINE_PREFIXES = ['<task-notification>', '<agent-message'];

// First matching rule wins; every other prompt asks, and Claude weighs the recommendation from context.
export function classify(prompt) {
  const text = prompt.trim();
  if (NOPLAN_RE.test(text)) return { result: 'noplan', rule: 'override #noplan' };
  if (PLAN_RE.test(text)) return { result: 'plan', rule: 'override #plan' };
  return { result: 'plan', rule: 'context' };
}

export function decide(event) {
  const prompt = event?.prompt;
  const mode = event?.permission_mode;
  if (typeof prompt !== 'string' || !prompt.trim()) return { action: 'none' };
  const text = prompt.trimStart();
  if (isSkippedPrompt(text) || MACHINE_PREFIXES.some((p) => text.startsWith(p)) || !MODES.includes(mode)) {
    return { action: 'none' };
  }
  const { result, rule } = classify(prompt);
  if (result === 'plan' && mode !== 'plan') return { action: 'enter', rule };
  // Leave plan mode only on the explicit override; any other prompt must not hijack a plan in progress.
  if (rule === 'override #noplan' && mode === 'plan') return { action: 'exit', rule };
  return { action: 'none', rule };
}

const WEIGH = `Before any other tool call, weigh this prompt against everything in your context (instructions, rules, memory, the conversation so far) and ask the user with AskUserQuestion whether to enter plan mode. Options: "Enter plan mode" and "Continue without plan mode"; put the one you recommend first and end its label with "(Recommended)", and give each option a one-line reason grounded in that context. Lean Enter when the prompt changes several files or components, has several valid approaches, has unclear requirements, changes behavior or architecture, or is risky or hard to reverse. Lean Continue when it is a question or explanation, a small or fully specified change, work already covered by an approved plan or spec, or a follow-up inside the current task.`;
const FORCED = `Before any other tool call, ask the user with AskUserQuestion whether to enter plan mode: the prompt carries #plan, so put "Enter plan mode (Recommended)" first with the reason "you asked for it with #plan", then "Continue without plan mode".`;
const AFTER = ` If they choose to enter, call EnterPlanMode (load it with ToolSearch if deferred) and plan this prompt. Otherwise do the prompt in the current mode.`;

export function output({ action, rule }) {
  if (action === 'none') return null;
  const enter = action === 'enter';
  const text = enter
    ? (rule === 'override #plan' ? FORCED : WEIGH) + AFTER
    : `Before any other tool call, call ExitPlanMode (load it with ToolSearch if deferred); after approval, do the prompt.`;
  return contextOutput('UserPromptSubmit', text, {
    systemMessage: `Plan mode: ${enter ? 'asking' : 'exiting'} (${rule})`
  });
}
