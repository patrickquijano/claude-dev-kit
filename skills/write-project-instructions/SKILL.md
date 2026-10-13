---
name: write-project-instructions
description: Creates, updates, or scores a project's CLAUDE.md and .claude/rules/*.md from input guidelines plus existing memory files, adding repo-adapted engineering principles, using bundled Claude Code best practices and a 100-point rubric (pass ≥95), iterating improvements up to 3 rounds. Use only when the user explicitly asks to write, update, merge, improve, audit, or score CLAUDE.md or project rules, e.g. "update CLAUDE.md", "merge these guidelines into CLAUDE.md", "improve my project rules", "score my CLAUDE.md". Do not use on your own after finishing a task.
argument-hint: '[guidelines text | file paths | score]'
allowed-tools: Bash(git rev-parse *)
---

# Write Project Instructions

Input: $ARGUMENTS

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `commands.md` row.

## Rules

- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Only this skill asks the user (AskUserQuestion); subagents cannot. AskUserQuestion or Write unavailable → ask the pending question as plain text with its options and end the turn; never print finished files in place of a pending question.
- Best practices and rubric: `${CLAUDE_SKILL_DIR}/references/rubric.md`. Skeletons: `${CLAUDE_SKILL_DIR}/assets/template.md`.
- Apply `${CLAUDE_SKILL_DIR}/references/principles.md` by default in create and update mode, adapted to facts and repo conventions, so every generated set carries engineering principles without the user asking.
- Write scope: project `CLAUDE.md` (or `.claude/CLAUDE.md` when that is the existing one) and `.claude/rules/**/*.md`. Never write `CLAUDE.local.md`, `~/.claude/**`, or managed policy.
- Never invent commands, paths, or policies. Not derivable → ask; user omits → leave out, add to `Omitted:`; never re-ask an omitted item.
- Update mode: keep correct content and author voice; change only stale, wrong, duplicate, conflicting, or missing items. Move any `Known issues` section to auto memory (`feedback` memory plus `MEMORY.md` pointer), then remove it; auto memory unavailable → keep it and report it.
- Conflict → never resolve silently; ask.
- Pass score = 95/100. Improve rounds max 3 (counter starts at 0, +1 per improve round). Never loop past the cap; list what is left in `Open:`.
- Score-only never writes. Formatter runs prompt for permission; expected.

## Workflow

1. **Pre-flight.** Root = Context → Repo root; `<none>` → cwd. `CLAUDE.md` or `.claude/CLAUDE.md` exists → update (both → ask which is the target); none → create, target `CLAUDE.md`. Existing `.claude/rules/` files are edited in place, never re-templated.
   - Input `score` or an audit-only request → score-only: steps 2, 6, 7. No target file → `Result: nothing-to-do`, suggest create mode.
   - Split input: existing file paths → `Input files:`; the rest → `Input text:`.
2. **Analyze.** Spawn `cdk:claude-md-analyzer` with root, `Target:`, `Input files:`, `Input text:`; keep its facts block.
3. **Combine.** Merge input and existing instructions per facts `Instructions`; ask conflicts and gaps (max 4 per call). Detail: `${CLAUDE_SKILL_DIR}/references/flow.md` `## Combine`.
4. **Draft.** Create → fill `assets/template.md`; update → edit in place. Place each instruction per rubric `## Placement rules` and principles per `principles.md` `## Placement`. Always-loaded non-blank lines stay <200; overflow → path-scoped rules.
   - Show file list (new | changed | deleted), outline, dropped and moved items, suggested hooks; write without asking and print each diff. Tracked file to delete → ask Delete (Recommended) | Keep.
5. **Write.** Write the files; facts `Formatter` not none → run it on them.
6. **Score.** Spawn `cdk:claude-md-scorer` per `flow.md` `## Scorer input`.
7. **Gate.** Score-only → show score and deductions (criterion, lost pts, fix), `Result: done`. ≥95 → `Result: done`. <95 → improve per `flow.md` `## Improve`; after 3 rounds → `Result: stopped`, `Stopped: 7: below 95 after 3 rounds`.
8. **Report.** List each leftover deduction in `Open:` with its fix; print the Output.

## Files

- For combine rules, the scorer input, and the improve loop, see `${CLAUDE_SKILL_DIR}/references/flow.md`.
- For the engineering principles, their placement, and the default requirements, see `${CLAUDE_SKILL_DIR}/references/principles.md`.
- For the 100-point rubric and placement rules, see `${CLAUDE_SKILL_DIR}/references/rubric.md`.
- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For the CLAUDE.md and rule skeletons filled in create mode, see `${CLAUDE_SKILL_DIR}/assets/template.md`.

## Output

```text
Files: <path — created | updated | deleted | scored, ...>
Always-loaded lines: <n, from scorer Z1 evidence>
Score: <n>/100 (pass | below 95)
Rounds: <improve rounds>
Omitted: <items the user chose to omit | none>
Open: <criterion, lost pts, fix, ... | none>
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
