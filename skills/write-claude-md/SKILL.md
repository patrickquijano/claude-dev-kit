---
name: write-claude-md
description: Create, update, or score a project's CLAUDE.md and .claude/rules/*.md from input guidelines plus existing memory files, adding repo-adapted engineering principles, using bundled Claude Code best practices and a 100-point rubric (pass ≥95), iterating improvements up to 3 rounds. Use only when the user explicitly asks to write, update, merge, improve, audit, or score CLAUDE.md or project rules, e.g. "update CLAUDE.md", "merge these guidelines into CLAUDE.md", "improve my project rules", "score my CLAUDE.md". Do not use on your own after finishing a task.
argument-hint: '[guidelines text | file paths | score]'
allowed-tools: Bash(git rev-parse *)
---

# Write CLAUDE.md

Input: $ARGUMENTS

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

A Context value of `<none>` means that read failed. A missing value or `[shell command execution disabled by policy]` means run that command's `commands.md` row instead.

## Rules

- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- User interaction (AskUserQuestion) only here; subagents can't ask.
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/../shared/references/fallbacks.md`.
- Best practices + rubric: `${CLAUDE_SKILL_DIR}/references/rubric.md`. Skeletons: `${CLAUDE_SKILL_DIR}/assets/template.md`.
- Engineering principles: apply `${CLAUDE_SKILL_DIR}/references/principles.md` by default in create and update mode, adapted to facts and repo conventions, so every generated set of memory files carries them (placement: `principles.md` `## Placement`) without the user asking.
- Write scope: project `CLAUDE.md` (or `.claude/CLAUDE.md` when that is the existing one) and `.claude/rules/**/*.md`. Never write `CLAUDE.local.md`, `~/.claude/**`, managed policy.
- Never invent commands, paths, or policies. Not derivable → ask; user omits → leave out, add to `Omitted:`.
- Update mode: keep correct content and author voice. Move any existing Known issues entries to auto memory (`feedback` memory plus `MEMORY.md` pointer), then remove the section; auto memory unavailable → keep the section and report it. Change only stale, wrong, duplicate, conflicting, or missing items.
- Conflict → never resolve silently; ask.
- Pass score = 95/100. Improve rounds max 3; the round counter starts at 0 and increments each improve round (step 7). Never re-ask an omitted item.
- Score-only never writes.
- Formatter runs prompt for permission; expected.
- Final step: follow `${CLAUDE_SKILL_DIR}/../shared/references/resolve-findings.md` (scope: edit, the target memory file and `.claude/rules/**/*.md` only; sources: `Remaining gaps:` scorer deductions).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../shared/references/known-issues.md` with slug `write-claude-md` and store `${CLAUDE_PLUGIN_DATA}/known-issues`.

## Workflow

1. **Pre-flight.** Root = Context → Repo root; `<none>` → cwd.
   - `CLAUDE.md` or `.claude/CLAUDE.md` exists → update mode. Both exist → AskUserQuestion which to keep as target.
   - None → create mode, target `CLAUDE.md`. Existing `.claude/rules/` files → edit in place, never re-template.
   - Input `score` or request is score/audit only → score-only: steps 2, 6, 7, 8. No target file → report it, suggest create mode, end with `Result: nothing-to-do`.
   - Split input: existing file paths → `Input files:`; rest → `Input text:`.
2. **Analyze.** Spawn `cdk:claude-md-analyzer` with root, `Target:`, `Input files:`, `Input text:`. Keep facts block.
3. **Combine.** Merge input + existing instructions per facts `Instructions`.
   - Drop derivable and duplicate items, fix stale and vague ones, ask each conflict and gap (max 4 per AskUserQuestion), draft the `principles` gap without a question. Detail: `${CLAUDE_SKILL_DIR}/references/combine.md`.
4. **Draft.** Create → fill `${CLAUDE_SKILL_DIR}/assets/template.md`. Update → edit existing files in place. Place each instruction per rubric `## Placement rules`.
   - Place principles per `principles.md` `## Placement`, using facts `Stack` for path-scoped rules and facts `Patterns` for in-use pattern lines.
   - Always-loaded non-blank lines stay <200; overflow → move component guidance to path-scoped rules.
   - Show file list (new | changed | deleted), outline per file, design trade-off order, dropped and moved items, suggested hooks for hard requirements. Write the edits without asking and print each file's diff. A tracked file to delete → AskUserQuestion: Delete (Recommended) | Keep; Keep → leave the file and mention it in the Output.
5. **Write** files. Facts `Formatter` not none → run it on written files.
6. **Score.** Spawn `cdk:claude-md-scorer` with: file paths (target memory file, its `@imports`, every file written in step 5, and every `.claude/rules/**/*.md` from facts `Memory files`, so Z1, P2, and E1 see all files), rubric path `${CLAUDE_SKILL_DIR}/references/rubric.md`, principles path `${CLAUDE_SKILL_DIR}/references/principles.md`, facts block (answers merged), `Omitted:` list.
7. **Gate.**
   - Score-only → show score + deductions table (criterion, lost pts, fix); write nothing; `Result: done`; go to step 8.
   - Total ≥95 → `Result: done`; go to step 8.
   - <95 and rounds = 3 → `Result: stopped`, `Stopped: 7: below 95 after 3 rounds`; go to step 8 with the remaining gaps.
   - <95 and rounds < 3 → show deductions table, then improve without asking. Detail: `${CLAUDE_SKILL_DIR}/references/improve.md`.
8. **Resolve findings.** Per resolve-findings.md. Itemize each `Remaining gaps:` deduction (criterion, lost pts, scorer fix as Recommended fix); the step never re-enters the improve loop. Score-only → report and ask only (writes nothing). Then print the Output.

## Output

```text
Files: <path — created | updated | deleted | scored, ...>
Always-loaded lines: <n, from scorer Z1 evidence>
Score: <n>/100 (pass | below 95)
Rounds: <improve rounds>
Remaining gaps: <criterion list or none>
Omitted: <items the user chose to omit | none>
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
