---
name: update-rules
description: Creates, updates, or scores CLAUDE.md and .claude/rules against a 100-point rubric, merging input guidelines; plan-approved. Use when asked to write, improve, or score them.
compatibility: Claude Code only. Uses argument-hint and CLAUDE_SKILL_DIR; claude.ai and API uploads reject unknown frontmatter keys.
argument-hint: '[--yes] [--no-plan] [guidelines text | file paths | score]'
allowed-tools: Bash(git rev-parse *) Bash(git ls-files *) Bash(node ${CLAUDE_SKILL_DIR}/scripts/count-context.mjs *)
---

# Update Rules

Input: $ARGUMENTS (strip `--yes` and `--no-plan` first)

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `${CLAUDE_SKILL_DIR}/references/commands.md` row.

## Rules

- Ask (unattended: record) what the input and repo cannot answer.
- Flags: `--yes` is unattended (no plan mode, no questions, recommended options, assumptions under `Omitted:` or `Open:`); `--no-plan` skips plan mode only and every question is still asked. Only a flag the user passed counts. `--yes` never covers deleting a tracked file or overwriting a dirty file: it is asked, or skipped and listed under `Open:`.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Only this skill asks the user (AskUserQuestion); subagents cannot. AskUserQuestion unavailable: see `${CLAUDE_SKILL_DIR}/references/flow.md` `## Fallback`. Write unavailable → `Result: stopped`, `Stopped: 5: write unavailable`. A dismissed question → `Result: cancelled` per `${CLAUDE_SKILL_DIR}/references/flow.md` `## Cancelled`.
- Best practices and rubric: `${CLAUDE_SKILL_DIR}/references/rubric.md`. Skeletons: `${CLAUDE_SKILL_DIR}/assets/template.md`.
- Apply `${CLAUDE_SKILL_DIR}/references/principles.md` by default in create and update mode, adapted to facts and repo conventions.
- Write scope: project `CLAUDE.md` (or `.claude/CLAUDE.md` when that is the existing one) and `.claude/rules/**/*.md`. Never write `CLAUDE.local.md`, `~/.claude/**`, or managed policy. Exception: the auto-memory directory (`~/.claude/projects/<project>/memory/`) takes only the `Known issues` move below (a `feedback` memory plus its `MEMORY.md` pointer), never other edits.
- Commands, paths, and policies not derivable → ask; user omits → leave out, add to `Omitted:`; never re-ask an omitted item.
- Update mode: keep correct content and author voice; change only stale, wrong, duplicate, conflicting, or missing items. Move any `Known issues` section to auto memory (`feedback` memory plus `MEMORY.md` pointer), then remove it; auto memory unavailable → keep it and list it under `Open:`.
- Conflict → never resolve silently; ask.
- Unattended (no way to ask): ask nothing; a conflict keeps the existing side, an ambiguous target is `CLAUDE.md`, a deletion is skipped, and an unanswerable gap goes to `Omitted:` (or `Open:` for score deductions).
- Pass score = 95/100. Improve rounds max 3 (counter starts at 0, +1 per improve round); only the step 8 improver applies score fixes. Never loop past the cap; list what is left in `Open:`.
- Always rescore (step 6) with a fresh scorer after every improve round, including the last and one with a malformed improver return; score every criterion from the current files, never carry a prior score or the improver's `Expected:` forward or assume a pass. The pass check and the cap are judged only on that rescore.
- Write and delete only after the `ExitPlanMode` approval, which lists every file to create, change, or delete and covers the first write only (each improve round re-enters plan mode); plan mode declined or unavailable → `Result: stopped`, `Stopped: 4: plan mode declined`. Plan mode skipped by `--no-plan` or `--yes`: the write follows the stated file list, and the declined stop does not apply. Unattended: per the line above. Score-only never writes. Formatter runs prompt for permission; expected.

## Workflow

1. **Pre-flight.** Root = Context → Repo root; `<none>` → cwd. `CLAUDE.md` or `.claude/CLAUDE.md` exists → update (both → ask which is the target); none → create, target `CLAUDE.md`. Existing `.claude/rules/` files are edited in place, never re-templated.
   - Input `score` or an audit-only request → score-only: steps 2, 6, 7, 9. No target file → `Result: nothing-to-do`, suggest create mode.
   - Then enter plan mode per `${CLAUDE_SKILL_DIR}/references/flow.md` `## Plan mode`, unless `--no-plan` or `--yes`.
   - Split input: existing file paths → `Input files:`; the rest → `Input text:`.
2. **Analyze.** Spawn a read-only instructions analyst subagent (fallback: `cdk:repo-analyzer`) with root, `Target:`, `Input files:`, `Input text:`, per `${CLAUDE_SKILL_DIR}/references/flow.md` `## Spawn briefs`; keep its facts block.
3. **Combine.** Merge input and existing instructions per facts `Instructions`; ask conflicts and gaps (max 4 per call). Detail: `${CLAUDE_SKILL_DIR}/references/flow.md` `## Combine`.
4. **Draft.** Create → fill `${CLAUDE_SKILL_DIR}/assets/template.md`; update → edit in place. Place each instruction per rubric `## Placement rules` and principles per `${CLAUDE_SKILL_DIR}/references/principles.md` `## Placement`. Always-loaded non-blank lines stay <200; overflow → path-scoped rules.
   - Show file list (new | changed | deleted), outline, dropped and moved items (including a `Known issues` move), suggested hooks, and each diff in the plan file for `ExitPlanMode` (`${CLAUDE_SKILL_DIR}/references/flow.md` `## Plan mode`). A tracked file to delete is listed in it.
5. **Write.** After approval, write the files and run `delete-file` for each file the approved plan lists for deletion; for a planned `Known issues` move also write the `feedback` memory and its `MEMORY.md` pointer in the existing auto-memory directory (path from the `MEMORY.md` path in the session's auto-memory context, never guessed; none found → keep it and list it under `Open:`), and list both paths in `Files:`. Then run `format-files`.
6. **Score.** Spawn a read-only scorer subagent (fallback: `cdk:rubric-scorer`) per `${CLAUDE_SKILL_DIR}/references/flow.md` `## Scorer input` and `## Spawn briefs`, rubric path `${CLAUDE_SKILL_DIR}/references/rubric.md`, principles path `${CLAUDE_SKILL_DIR}/references/principles.md`.
7. **Report.** Show the score table and deductions (criterion, lost pts, fix). Score-only or ≥95 → `Result: done`. At the cap with <95 → `Result: stopped`, `Stopped: 7: below 95 after 3 rounds`.
8. **Improve.** <95 and rounds <3 → enter plan mode first unless skipped (`flow.md` `## Improve`), then spawn an improver subagent (fallback: `cdk:rubric-improver`) per `${CLAUDE_SKILL_DIR}/references/flow.md` `## Improve` and `## Spawn briefs` with the same rubric and principles paths as step 6, then `format-files`, step 6 rescore, step 7.
9. **Leftovers.** List each leftover deduction in `Open:` with its fix; print the Output.

## Files

- For plan mode, combine rules, the unattended fallback, cancel handling, the scorer input, the improve loop, and spawn briefs, see `${CLAUDE_SKILL_DIR}/references/flow.md`.
- For the engineering principles, their placement, and the default requirements, see `${CLAUDE_SKILL_DIR}/references/principles.md`.
- For the 100-point rubric and placement rules, see `${CLAUDE_SKILL_DIR}/references/rubric.md`.
- For the evals, see `${CLAUDE_SKILL_DIR}/references/evals.md`.
- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For the context line and glob match counts (steps 2 and 4; run, never read), see `${CLAUDE_SKILL_DIR}/scripts/count-context.mjs`.
- For the CLAUDE.md and rule skeletons filled in create mode, see `${CLAUDE_SKILL_DIR}/assets/template.md`.
- For the grill table, anchors, and sensitivity rule, read `${CLAUDE_SKILL_DIR}/references/grill.md` when the conflicts step asks a decision question.

## Output

```text
Plan mode: entered | already active | declined | skipped (--no-plan | --yes | <reason>)
Files: <path — created | updated | deleted | scored, ...>
Always-loaded lines: <project n> + <ancestor n>
Score: <n>/100 (pass | below 95) | n/a
Rounds: <improve rounds>
Omitted: <items the user chose to omit | none>
Confirmed: yes | no (stopped) | unattended | n/a (score-only or stopped earlier)
Open: <criterion, lost pts, fix, ... | none>
Next: commit the changed files | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
