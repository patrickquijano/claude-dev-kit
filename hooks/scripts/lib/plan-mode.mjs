// Plan-mode logic for the UserPromptSubmit dispatcher (user-prompt-submit.mjs): ask Claude to ask the user about plan
// mode, with the recommendation weighed against the context Claude sees, or to leave plan mode on #noplan.
// Hooks cannot change the mode themselves.
import { contextOutput } from './hook-io.mjs';
import { NOPLAN_RE, PLAN_RE, isMachinePrompt, isSkippedPrompt } from './prompt.mjs';

const MODES = ['default', 'plan', 'acceptEdits', 'auto', 'dontAsk', 'bypassPermissions'];

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
  if (isSkippedPrompt(text) || isMachinePrompt(text) || !MODES.includes(mode)) {
    return { action: 'none' };
  }
  const { result, rule } = classify(prompt);
  if (result === 'plan' && mode !== 'plan') return { action: 'enter', rule };
  // Leave plan mode only on the explicit override; any other prompt must not hijack a plan in progress.
  if (rule === 'override #noplan' && mode === 'plan') return { action: 'exit', rule };
  return { action: 'none', rule };
}

const WEIGH = `Before any other tool call, weigh this prompt against your context and ask the user with AskUserQuestion whether to enter plan mode: options "Enter plan mode" and "Continue without plan mode", the one you recommend first with "(Recommended)" on its label, each with a one-line reason from your context. Lean Enter for multi-file, ambiguous, behavior-changing, or risky work; Lean Continue for questions, small specified changes, work an approved plan covers, or follow-ups.`;
const FORCED = `Before any other tool call, ask the user with AskUserQuestion whether to enter plan mode: "Enter plan mode (Recommended)" first, reason "you asked for it with #plan", then "Continue without plan mode".`;
const AFTER = ` On Enter, call EnterPlanMode (ToolSearch if deferred) and plan this prompt; otherwise do it in the current mode.`;

export function output({ action, rule }) {
  if (action === 'none') return null;
  const enter = action === 'enter';
  const text = enter
    ? (rule === 'override #plan' ? FORCED : WEIGH) + AFTER
    : `Before any other tool call, call ExitPlanMode (load it with ToolSearch if deferred); after approval, do the prompt.`;
  return contextOutput('UserPromptSubmit', text);
}
