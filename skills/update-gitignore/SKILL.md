---
name: update-gitignore
description: Finds generated, local, and secret paths not to commit and appends approved ones to .gitignore after confirmation. Use when asked to update .gitignore.
compatibility: Claude Code only. Uses CLAUDE_SKILL_DIR; claude.ai and API uploads reject unknown frontmatter keys.
allowed-tools: Bash(git rev-parse *) Bash(git ls-files *) Bash(git check-ignore *)
---

# Update gitignore

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `${CLAUDE_SKILL_DIR}/references/commands.md` row.

## Rules

- Ask (unattended: record) what the input and repo cannot answer.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Evidence only: every candidate cites a file on disk, a manifest, or a tool config that produces it; never add a path from the stack name alone.
- Never read the contents of `.env*`, key, or credential files; their names are enough.
- Idempotent: a path already ignored (`check-ignore`) is skipped; existing `.gitignore` lines are kept and never reordered. `nothing-to-do` = no candidate left.
- Never untrack, delete, commit, or push; a tracked file that matches a candidate is reported under `Tracked but ignored:`, not changed. A tracked `.env*`, key, or credential file is secret exposure: report it under `Secret exposure:` (name only, never contents) with the advice to rotate the secret and untrack the file.
- `check-ignore` paths are repo-relative to the root (no leading `/`, no absolute path), run from the root.
- Write only the root `.gitignore`, after the step 4 choice and the step 5 Confirm; unattended (no way to ask) writes only `high`-confidence candidates.
- Caps: the analyst reads at most 40 files and is re-spawned at most once; one choose round, then the Confirm.
- Decision questions: at most 4 per call, the Recommended first, a Stop option on every call (Stop → `Result: cancelled`). Grill (decision questions only; gates keep their form): mine the conversation, files, and repo first, ask only what changes the output, and never fill a gap with an assumption. Use the structured-question tool (discover its name and limits at runtime; inside a delegated subagent ask in the main thread before delegating; unavailable → a numbered inline list, then stop for the answer). A fact-dependent question gets one web search per topic, official docs preferred, URLs cited; no search tool or source → "unverified", never an invented fact, source, or number. Before each question show the score table, the recommendation, and the option descriptions per `${CLAUDE_SKILL_DIR}/references/grill.md`.

## Workflow

1. **Pre-flight.** Repo root `<none>` → stop ("not a git repository"). Work from the root.
2. **Analyze.** Spawn a read-only repo analyst subagent with the repo root and `${CLAUDE_SKILL_DIR}/references/signals.md`, per `${CLAUDE_SKILL_DIR}/references/spawns.md`. Its `Questions:` → ask the user, re-spawn once; unattended → skip the affected candidates, list them under `Skipped:`, never re-spawn. `Candidates:` `(none)` → step 3 for the secret check, then step 6 with `nothing-to-do`.
3. **Report.** Show a table: path, category, evidence, confidence, grouped by category. Move each `Tracked but ignored` file that matches the Secrets category (`signals.md` `## Tracked secrets`) into `Secret exposure:` (every tracked secret path, none dropped); the Output prints it even with `Candidates: none`, `Report only`, or `Stop`.
4. **Choose.** Print the exact lines to append under each category, then AskUserQuestion: Add all | Add high-confidence only | Report only | Stop, with Add all first and marked (Recommended), except when medium candidates outnumber high (and high is at least 1): then Add high-confidence only goes first and is marked. Zero high candidates → never recommend or offer Add high-confidence only. Each option names what will be written; the choice is not the write confirmation (step 5 Confirm). One reason line cites the evidence (candidate count, medium-confidence share, tracked secrets). Report only and Stop write nothing; Report only, or unattended with no high candidate, ends `Result: done` with medium candidates under `Skipped:`. No candidate left → no ask. Unattended → write per the Rules, `Confirmed: unattended`. Stop → `Confirmed: no (stopped)`.
5. **Write.** **Confirm.** State in at most 3 lines what will change, then ask Yes | No with AskUserQuestion; proceed only on Yes, else `Result: cancelled`. Unattended: no Confirm. Then append each category under a `# <Category>` comment, creating the file if missing; anchor root-only paths with a leading `/`. Write the category lines first, then run `check-ignore` on each `!` negation path (for example `.env.example`); not ignored → remove that negation line (it would do nothing). Then `check-ignore` the written paths. Write unavailable → print the lines to append, `Result: stopped`, `Stopped: 5: write unavailable`. **Plan mode (each round).** At the start of each iteration, before any fix, enter plan mode (load `EnterPlanMode` with ToolSearch if deferred), present the findings and proposed fixes, and wait for `ExitPlanMode` approval.
6. **Output.** Print the block below, nothing else.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For signals, categories, and confidence levels (read by the analyst), see `${CLAUDE_SKILL_DIR}/references/signals.md`.
- For the analyst spawn brief, its return block, and the inline fallback (step 2), see `${CLAUDE_SKILL_DIR}/references/spawns.md`.
- For the evals, see `${CLAUDE_SKILL_DIR}/references/evals.md`.
- For the grill table, anchors, and sensitivity rule, read `${CLAUDE_SKILL_DIR}/references/grill.md` when step 4 asks a decision question.

## Output

```text
Repository: <root>
Explored: <n> files, stacks <names | none>
Candidates: <n> (<n> high, <n> medium)
Added: <path (category), ... | none>
Skipped: <path: reason, ... | none>
Tracked but ignored: <files; untrack yourself with git rm --cached | none>
Secret exposure: <tracked secret file names; rotate the secret and untrack with git rm --cached | none>
Confirmed: <Add all | Add high-confidence only | Report only | no (stopped) | unattended | n/a (nothing to do)>
Verify: <all written paths ignored | not ignored: <path> | n/a>
Next: commit the .gitignore change | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
