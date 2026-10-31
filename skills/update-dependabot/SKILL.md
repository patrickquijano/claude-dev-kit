---
name: update-dependabot
description: Creates or updates .github/dependabot.yaml from the repo's package ecosystems and directories, merged in place and schema-checked. Use when asked to set up, add, or update Dependabot.
compatibility: Claude Code only. Uses argument-hint and CLAUDE_SKILL_DIR; claude.ai and API uploads reject unknown frontmatter keys.
argument-hint: '[--yes] [--no-plan]'
allowed-tools: Read Bash(git rev-parse *) Bash(git ls-files *) Bash(command -v uvx) Bash(command -v pipx)
---

# Update Dependabot

Input: $ARGUMENTS (strip `--yes` and `--no-plan` first)

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`
- Existing config: !`git ls-files --cached --others --exclude-standard -- .github/dependabot.yml .github/dependabot.yaml 2>/dev/null || echo '<none>'`

`<none>` = that read failed; for Existing config, empty output also = `<none>` (the command exits 0 when nothing matches), and untracked files count. A missing value or `[shell command execution disabled by policy]` = run the `commands.md` row.

## Rules

- Ask (`--yes`: record) what the input and repo cannot answer.
- Flags: `--yes` = unattended (no plan mode, no questions, recommended options, assumptions under `Open:`); `--no-plan` skips plan mode only and every question is still asked. Only a flag the user passed counts, never add one. `--yes` never covers a destructive step (overwriting a user-edited entry, deleting an entry, writing when both `.yml` and `.yaml` exist): it is asked, or skipped and listed under `Open:`.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Every option, key, and ecosystem value comes from the official options reference fetched this run (step 3), never from memory. No source reachable → `unverified`, the entry is not written.
- Existing file: merge in place, keep its extension and every user entry; change only invalid or stale keys, each named in the plan. Idempotent: a re-run changes nothing.
- Never run git write commands; never create a branch or commit.
- Decision questions: at most 4 per call, 2-4 options, the Recommended first; each asked once. Grill: mine the repo first, ask only what changes the output, never fill a gap with an assumption. Use the structured-question tool (unavailable → take the Recommended and list it under `Open:`). Before each question show the score table per `${CLAUDE_SKILL_DIR}/references/grill.md`; a close call has no Recommended and goes under `Open:`.
- Approval: nothing is written before the `ExitPlanMode` approval after step 5 (`plan.md`); each step 7 fix round re-enters plan mode. Plan mode declined → `Result: stopped`, `Stopped: 0: plan mode declined`; 3 rejections → `Result: cancelled`. `--no-plan` replaces approval with an ask `Apply` | `Stop`.
- No way to ask and no `--yes` → write nothing, `Stopped: 0: cannot interact`.
- Cap: fix loop 3 rounds; leftovers go under `Open:`.

## Workflow

1. **Pre-flight.** Repo root `<none>` → stop ("not a git repository"). Both `.yml` and `.yaml` exist → ask which to keep, never merge both. Enter plan mode per `${CLAUDE_SKILL_DIR}/references/plan.md` (`--no-plan` | `--yes`: skip).
2. **Detect.** Per `ecosystems.md`: list manifests with `git-ls-files`, map each to its `package-ecosystem` and `directories`. Nothing found → stop (`Result: nothing-to-do`).
3. **Research.** Spawn the `cdk:topic-researcher` subagent (fallback: a read-only subagent that cites official sources; inline fallback: WebFetch of the URLs in `options.md`) for the current options, deprecations, and defaults listed there, with the brief in `options.md`; cite URLs.
4. **Questions.** Per `options.md`: schedule interval, grouping, cooldown, commit-message prefix (default from the repo's commitlint config). Each with the grill table.
5. **Merge and plan.** Build the merged file per `merge.md`, show the diff, write the plan, `ExitPlanMode`.
6. **Write.** Write the file at its existing path, else `.github/dependabot.yaml`.
7. **Validate.** Per `schema.md`: the schema check when `uvx` or `pipx` exists, else its manual checklist. Fix loop up to the cap, each round in plan mode.
8. **Report** the Output.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For the plan-mode entry (step 1) and fix rounds, see `${CLAUDE_SKILL_DIR}/references/plan.md`.
- For the manifest → ecosystem map (step 2), see `${CLAUDE_SKILL_DIR}/references/ecosystems.md`.
- For research sources and the questions (steps 3-4), see `${CLAUDE_SKILL_DIR}/references/options.md`.
- For merging (step 5), see `${CLAUDE_SKILL_DIR}/references/merge.md`.
- For validation (step 7), see `${CLAUDE_SKILL_DIR}/references/schema.md`.
- For the grill table, anchors, and sensitivity rule, read `${CLAUDE_SKILL_DIR}/references/grill.md` when a step asks a decision question.
- For test prompts and pass criteria, see `${CLAUDE_SKILL_DIR}/references/evals.md`.

## Output

```text
Plan mode: entered | already active | declined | skipped (--no-plan | --yes)
File: <path> (<created | merged | unchanged>)
Ecosystems: <ecosystem: directories>, ... | none
Changes: <added | fixed | kept entries> | none
Research: <url>, ... | unverified
Validation: schema check pass | manual checklist pass | <failures>
Open: <item: impact; recommended fix, ...> | none
Next: commit the changes | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
