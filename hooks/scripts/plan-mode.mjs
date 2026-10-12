// Plan-mode logic for the UserPromptSubmit dispatcher (user-prompt-submit.mjs): decide whether the prompt needs plan
// mode and ask Claude to ask the user, or to leave plan mode. Hooks cannot change the mode themselves.

const MODES = ['default', 'plan', 'acceptEdits', 'auto', 'dontAsk', 'bypassPermissions'];
const QUESTION_WORDS = /^(what|why|how|where|when|which|who|is|are|can|could|does|do|should|explain)\b/i;
const CHANGE_VERBS =
  /\b(implement|build|add|create|refactor|migrate|redesign|rewrite|update|change|integrate|set up|replace|remove|convert|port)\b/i;
const SCOPE_WORDS =
  /\b(architecture|across|multiple files|end-to-end|migration|redesign|refactor|feature|workflow|system|pipeline)\b/i;

const listItems = (prompt) => (prompt.match(/^\s*(?:[-*+]|\d+[.)])\s+\S/gm) || []).length;

// First matching rule wins.
export function classify(prompt) {
  const text = prompt.trim();
  if (/(^|\s)#noplan\b/.test(text)) return { result: 'noplan', rule: 'override #noplan' };
  if (/(^|\s)#plan\b/.test(text)) return { result: 'plan', rule: 'override #plan' };
  const items = listItems(text);
  if ((QUESTION_WORDS.test(text) || text.endsWith('?')) && items < 3) {
    return { result: 'noplan', rule: 'question' };
  }
  if (CHANGE_VERBS.test(text)) {
    if (items >= 3) return { result: 'plan', rule: 'change with 3+ list items' };
    if (text.length >= 600) return { result: 'plan', rule: 'long change request' };
    if (SCOPE_WORDS.test(text)) return { result: 'plan', rule: 'change with broad scope' };
  }
  return { result: 'noplan', rule: 'small request' };
}

export function decide(event) {
  const prompt = event?.prompt;
  const mode = event?.permission_mode;
  if (typeof prompt !== 'string' || !prompt.trim()) return { action: 'none' };
  if (/^\s*[/!]/.test(prompt) || !MODES.includes(mode)) return { action: 'none' };
  const { result, rule } = classify(prompt);
  if (result === 'plan' && mode !== 'plan') return { action: 'enter', rule };
  // Leave plan mode only on the explicit override; a question or small request must not hijack a plan in progress.
  if (rule === 'override #noplan' && mode === 'plan') return { action: 'exit', rule };
  return { action: 'none', rule };
}

export function output({ action, rule }) {
  if (action === 'none') return null;
  const enter = action === 'enter';
  return {
    systemMessage: `Plan mode: ${enter ? 'suggesting' : 'exiting'} (${rule})`,
    hookSpecificOutput: {
      hookEventName: 'UserPromptSubmit',
      additionalContext: enter
        ? `Before any other tool call, ask the user with AskUserQuestion whether to enter plan mode (options: Enter plan mode (Recommended) / Continue without plan mode; give the reason: ${rule}). If they choose to enter, call EnterPlanMode (load it with ToolSearch if deferred) and plan this prompt. Otherwise do the prompt in the current mode.`
        : `Before any other tool call, call ExitPlanMode (load it with ToolSearch if deferred); after approval, do the prompt.`
    }
  };
}
