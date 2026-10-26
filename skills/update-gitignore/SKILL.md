---
name: update-gitignore
description: Finds generated, local, and secret paths not to commit and appends approved ones to .gitignore after plan approval. Use only when the user explicitly asks to update .gitignore.
compatibility: Claude Code only. Uses disable-model-invocation and CLAUDE_SKILL_DIR; claude.ai and API uploads reject unknown frontmatter keys.
allowed-tools: Bash(git rev-parse *) Bash(git ls-files *) Bash(git check-ignore *)
disable-model-invocation: true
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
- Write only the root `.gitignore`, after the step 4 choice and the `ExitPlanMode` approval (`## Plan mode`); unattended (no way to ask) writes only `high`-confidence candidates.
- Caps: the analyst reads at most 40 files and is re-spawned at most once; one choose round, then the plan.
- AskUserQuestion: at most 4 questions per call, recommended first with its reason, Stop option on every call (Stop → `Result: cancelled`).

## Workflow

1. **Pre-flight.** Repo root `<none>` → stop ("not a git repository"). Work from the root. Then enter plan mode per `## Plan mode` (skipped when unattended).
2. **Analyze.** Spawn a read-only repo analyst subagent with the repo root and `${CLAUDE_SKILL_DIR}/references/signals.md`, per `${CLAUDE_SKILL_DIR}/references/spawns.md`. Its `Questions:` → ask the user, re-spawn once; unattended → skip the affected candidates, list them under `Skipped:`, never re-spawn. `Candidates:` `(none)` → step 3 for the secret check, then step 6 with `nothing-to-do`.
3. **Report.** Show a table: path, category, evidence, confidence, grouped by category. Move each `Tracked but ignored` file that matches the Secrets category (`signals.md` `## Tracked secrets`) into `Secret exposure:` (every tracked secret path, none dropped); the Output prints it even with `Candidates: none`, `Report only`, or `Stop`.
4. **Choose.** Print the exact lines to append under each category, then AskUserQuestion: Add all | Add high-confidence only | Report only | Stop, with Add all first and marked (Recommended), except when medium candidates outnumber high (and high is at least 1): then Add high-confidence only goes first and is marked. Zero high candidates → never recommend or offer Add high-confidence only. Each option names what goes in the plan; the choice is not the write confirmation, and Add choices go into the plan file and `ExitPlanMode`. One reason line cites the evidence (candidate count, medium-confidence share, tracked secrets). Report only and Stop write nothing; Report only, or unattended with no high candidate, ends `Result: done` with medium candidates under `Skipped:`. No candidate left → no ask. Unattended → write per the Rules, `Confirmed: unattended`. Stop → `Confirmed: no (stopped)`.
5. **Write.** After the approval, append each category under a `# <Category>` comment, creating the file if missing; anchor root-only paths with a leading `/`. Write the category lines first, then run `check-ignore` on each `!` negation path (for example `.env.example`); not ignored → remove that negation line (it would do nothing). Then `check-ignore` the written paths. Write unavailable → print the lines to append, `Result: stopped`, `Stopped: 5: write unavailable`.
6. **Output.** Print the block below, nothing else.

## Plan mode

Runs once, right after step 1. Unattended → `Plan mode: skipped (unattended)`.

- Plan mode already active → `already active`, stay in it. Otherwise load `EnterPlanMode` with ToolSearch if it is deferred, then call it. The user declines it, or the tool is unavailable → `declined`, `Result: stopped`, `Stopped: 5: plan mode declined`, `Confirmed: no (stopped)`; nothing is written.
- Steps 2–4 run inside plan mode: they only read, spawn the read-only analyst, run `check-ignore`, and ask.
- After an Add choice, the plan file holds: the exact lines to append per category; the `Secret exposure:` and `Tracked but ignored:` items; the effects (root `.gitignore` created or appended, negation lines checked, "never untracks, commits, or pushes"). Call `ExitPlanMode`.
- Approval covers step 5's appends and its removal of no-op negation lines.
- Report only, Stop, or no candidates → no plan, nothing written.
- Rejection → revise the lines per the feedback and call `ExitPlanMode` again; 3 rejections → `Result: cancelled`, `Stopped: 5: plan rejected`, `Confirmed: no (stopped)`.
- Any end before step 5 prints the Output with `Plan mode:` as reached (`skipped (<reason>)` when never entered).

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For signals, categories, and confidence levels (read by the analyst), see `${CLAUDE_SKILL_DIR}/references/signals.md`.
- For the analyst spawn brief, its return block, and the inline fallback (step 2), see `${CLAUDE_SKILL_DIR}/references/spawns.md`.
- For the evals, see `${CLAUDE_SKILL_DIR}/references/evals.md`.

## Output

```text
Plan mode: entered | already active | declined | skipped (<reason>)
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
