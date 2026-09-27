# Prompt checks

Each check: anti-pattern → what the drafted prompt must contain instead. Mark a check n/a only when the task makes it irrelevant.

## Task

- Vague task verb → one concrete verb (add, fix, rename, delete, migrate), not "improve", "handle", "look at".
- Two tasks in one prompt / Build-the-whole-thing → one shippable slice; list the rest as follow-ups.
- Emotional task description → neutral facts: symptom, expected vs actual; drop urgency and frustration.
- Vague first turn for an agentic model → first turn passes Task, Context, and Correctness checks; no "let's get started".
- Vague aesthetic adjectives → measurable spec (spacing px, color token, breakpoint, reference component), not "clean", "modern", "nice".

## Context

- No project context → one line: what the project is and who uses it.
- Forgotten stack / No stack constraints → language, framework, versions from manifests; allowed libraries; no new dependencies unless named.
- Implicit reference / No file path → exact file paths, with symbols or line numbers when known; no "it", "that bug", "the thing above".
- Assumed prior knowledge → define domain terms and acronyms the agent cannot derive from the repo.
- Expecting inter-session memory → include every needed fact; no "as we discussed" or "like last time".
- No starting state → current behavior, branch, and relevant file state.
- No target state → observable end state after the change.
- No mention of prior failures → approaches already tried and why they failed.
- Contradicting prior work → name existing code or decisions to keep; say what to change and what to preserve.
- Pasting entire codebase → file paths and symbols to read, not pasted source; paste only short decisive snippets or errors.

## Scope and safety

- No scope boundary → files and directories in scope; everything else out of scope.
- Over-permissive agent / Unlocked filesystem → allowed paths, commands, and tools; forbid edits outside scope, destructive commands, and network or git pushes unless named.
- No stop condition for agents → stop when success criteria pass, or after 3 failed attempts unless the user sets another limit.
- No human review trigger → pause and ask before: deleting files, changing public API or schema, adding dependencies, or when requirements conflict.
- Silent agent → report progress at named checkpoints and list assumptions made.

## Correctness

- No success criteria → verifiable checks: test command, lint, expected output, acceptance cases.
- No audit contract for logic task → state invariants, edge cases, and a test per behavior; require the agent to show which test proves each.
- Hallucination invite / No grounding rule for factual tasks → verify APIs and facts against code or official docs; say "unknown" instead of guessing; cite file:line or URL.
- Requesting hidden reasoning → ask for a short decision summary, not chain-of-thought.

## Output

- Undefined audience → who reads the result (reviewer, end user, future agent).
- Missing output format → exact shape: diff summary, file list, table, JSON schema.
- Implicit length → length bound (lines, bullets, words).
- No role assignment → one-line role matching the task (e.g. "senior Go reviewer").

## Session

- Context rot on long sessions → multi-slice work: write progress to a named file; `/clear` or new session between slices; re-state key facts in each new prompt.
