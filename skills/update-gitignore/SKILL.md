---
name: update-gitignore
description: Finds generated, local, and secret paths not to commit and appends approved ones to .gitignore. Use only when the user explicitly asks to update .gitignore, or when chained.
allowed-tools: Bash(git rev-parse *) Bash(git check-ignore *)
---

# Update gitignore

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `commands.md` row.

## Rules

- Rigor: never guess or invent: confirm each path, command, and fact by reading it; ask (unattended: record) what the input and repo cannot answer. Finish every step in full, think twice before each irreversible step, and re-check the result against these rules and the repo's standards before reporting.
- Efficiency: read only what a step needs, keep output terse, and take the fewest steps that meet the goal; when work is autonomous and splits cleanly, spawn independent subagents in one parallel turn.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Evidence only: every candidate cites a file on disk, a manifest, or a tool config that produces it; never add a path from the stack name alone.
- Never read the contents of `.env*`, key, or credential files; their names are enough.
- Idempotent: a path already ignored (`check-ignore`) is skipped; existing `.gitignore` lines are kept and never reordered. `nothing-to-do` = no candidate left.
- Never untrack, delete, commit, or push; a tracked file that matches a candidate is reported under `Tracked but ignored:`, not changed.
- Write only the root `.gitignore`, after the user's choice; unattended (chained, no way to ask) writes only `high`-confidence candidates.
- Caps: the analyzer reads at most 40 files and is re-spawned at most once; one choose round, then write.
- AskUserQuestion: at most 4 questions per call, recommended first with its reason, Stop option on every call (Stop → `Result: cancelled`).

## Workflow

1. **Pre-flight.** Repo root `<none>` → stop ("not a git repository"). Work from the root.
2. **Analyze.** Spawn `cdk:repo-analyzer` with `kind: gitignore`, the repo root and `${CLAUDE_SKILL_DIR}/references/signals.md`. Its `Questions:` → ask the user, re-spawn once. `Candidates: none` → step 6 with `nothing-to-do`.
3. **Report.** Show a table: path, category, evidence, confidence, grouped by category.
4. **Choose.** AskUserQuestion: Add all (Recommended) | Add high-confidence only | Report only | Stop. Each option names the write.
5. **Write.** Append each category under a `# <Category>` comment, creating the file if missing; anchor root-only paths with a leading `/`. Then `check-ignore` the written paths.
6. **Output.** Print the block below, nothing else.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For signals, categories, and confidence levels (read by the analyzer), see `${CLAUDE_SKILL_DIR}/references/signals.md`.

## Output

```text
Repository: <root>
Explored: <n> files, stacks <names | none>
Candidates: <n> (<n> high, <n> medium)
Added: <path (category), ... | none>
Skipped: <path: reason, ... | none>
Tracked but ignored: <files; untrack yourself with git rm --cached | none>
Verify: <all written paths ignored | not ignored: <path>>
Next: /cdk:commit-changes | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
