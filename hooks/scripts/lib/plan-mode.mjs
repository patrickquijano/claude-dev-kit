// Plan-mode logic for the UserPromptSubmit dispatcher (user-prompt-submit.mjs): ask Claude to ask the user about plan
// mode for every prompt, or to leave plan mode on #noplan. Hooks cannot change the mode themselves.
import { contextOutput } from './hook-io.mjs';
import { NOPLAN_RE, PLAN_RE, isSkippedPrompt } from './prompt.mjs';

const MODES = ['default', 'plan', 'acceptEdits', 'auto', 'dontAsk', 'bypassPermissions'];
// Turns the harness starts itself (background-agent reports, cross-agent messages); never ask on these.
const MACHINE_PREFIXES = ['<task-notification>', '<agent-message'];

// First matching rule wins; every other prompt asks.
export function classify(prompt) {
  const text = prompt.trim();
  if (NOPLAN_RE.test(text)) return { result: 'noplan', rule: 'override #noplan' };
  if (PLAN_RE.test(text)) return { result: 'plan', rule: 'override #plan' };
  return { result: 'plan', rule: 'every prompt' };
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

export function output({ action, rule }) {
  if (action === 'none') return null;
  const enter = action === 'enter';
  const text = enter
    ? `Before any other tool call, ask the user with AskUserQuestion whether to enter plan mode (options: Enter plan mode (Recommended) / Continue without plan mode; give the reason: ${rule}). If they choose to enter, call EnterPlanMode (load it with ToolSearch if deferred) and plan this prompt. Otherwise do the prompt in the current mode.`
    : `Before any other tool call, call ExitPlanMode (load it with ToolSearch if deferred); after approval, do the prompt.`;
  return contextOutput('UserPromptSubmit', text, {
    systemMessage: `Plan mode: ${enter ? 'suggesting' : 'exiting'} (${rule})`
  });
}
