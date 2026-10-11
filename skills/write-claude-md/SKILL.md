---
name: write-claude-md
description: Create, update, or score a project's CLAUDE.md and .claude/rules/*.md from input guidelines plus existing memory files, adding repo-adapted engineering principles, using bundled Claude Code best practices and a 100-point rubric (pass ≥95), iterating improvements up to 3 rounds. Use only when the user explicitly asks to write, update, merge, improve, audit, or score CLAUDE.md or project rules, e.g. "update CLAUDE.md", "merge these guidelines into CLAUDE.md", "improve my project rules", "score my CLAUDE.md". Do not use on your own after finishing a task.
argument-hint: '[guidelines text | file paths | score]'
allowed-tools: Bash(git rev-parse *)
---

# Write CLAUDE.md

Input: $ARGUMENTS

## Rules

- User interaction (AskUserQuestion) only here; subagents can't ask.
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/fallbacks.md`.
- Best practices + rubric: `${CLAUDE_SKILL_DIR}/rubric.md`. Skeletons: `${CLAUDE_SKILL_DIR}/template.md`.
- Engineering principles: apply `${CLAUDE_SKILL_DIR}/principles.md` by default in create and update mode, adapted to facts and repo conventions, so every generated set of memory files carries them (placement: `principles.md` `## Placement`) without the user asking.
- Write scope: project `CLAUDE.md` (or `.claude/CLAUDE.md` when that is the existing one) and `.claude/rules/**/*.md`. Never write `CLAUDE.local.md`, `~/.claude/**`, managed policy.
- Never invent commands, paths, or policies. Not derivable → ask; user omits → leave out, add to `Omitted:`.
- Update mode: keep correct content, author voice, every Known issues entry. Change only stale, wrong, duplicate, conflicting, or missing items.
- Conflict → never resolve silently; ask.
- Pass score = 95/100. Improve rounds max 3; the round counter starts at 0 and increments each improve round (step 7). Never re-ask an omitted item.
- Score-only never writes.
- Formatter runs prompt for permission; expected.
- Final step: follow `${CLAUDE_SKILL_DIR}/../build-skill/resolve-findings.md` (scope: edit, the target memory file and `.claude/rules/**/*.md` only; sources: `Remaining gaps:` scorer deductions).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `write-claude-md`.

## Workflow

1. **Pre-flight.** Root = `git rev-parse --show-toplevel`; fail → cwd.
   - `CLAUDE.md` or `.claude/CLAUDE.md` exists → update mode. Both exist → AskUserQuestion which to keep as target.
   - None → create mode, target `CLAUDE.md`. Existing `.claude/rules/` files → edit in place, never re-template.
   - Input `score` or request is score/audit only → score-only: steps 2, 6, 7, 8. No target file → report it, suggest create mode, end with `Result: nothing-to-do`.
   - Split input: existing file paths → `Input files:`; rest → `Input text:`.
2. **Analyze.** Spawn `cdk:claude-md-analyzer` with root, `Target:`, `Input files:`, `Input text:`. Keep facts block.
3. **Combine.** Merge input + existing instructions per facts `Instructions`.
   - `derivable` → drop. `duplicate` → keep copy in file placement rules assign, drop others. List dropped items for step 4.
   - `stale` → fix from facts `Commands`/paths; no match → ask. `vague` → rewrite from facts; else ask with "Omit" option.
   - Each facts `Conflicts:` item → one question: keep A | keep B | merge; recommend input (newer) unless it breaks a verified fact. One side unwritable (`CLAUDE.local.md`, ancestor) → options: override in project file (name winner) | keep unwritable side; say it can't be edited.
   - Each facts `Gaps:` item (architecture, precedence, boundaries, focused changes, done, maintenance) → one question with "Omit" option. Precedence → use the template order, no question.
   - `principles` gap → no question; draft from `principles.md` (step 4 plan lists it). Default requirement with no repo support (e.g. no test runner) → omit and list under `Omitted:`.
   - Max 4 per AskUserQuestion; more → next call. Record omitted items as `Omitted:` list. Nothing to ask → skip.
4. **Draft.** Create → fill `${CLAUDE_SKILL_DIR}/template.md`. Update → edit existing files in place. Place each instruction per rubric `## Placement rules`.
   - Place principles per `principles.md` `## Placement`, using facts `Stack` for path-scoped rules and facts `Patterns` for in-use pattern lines.
   - Always-loaded non-blank lines stay <200; overflow → move component guidance to path-scoped rules.
   - Show file list (new | changed | deleted), outline per file, design trade-off order, dropped and moved items, suggested hooks for hard requirements. Write the edits without asking and print each file's diff. A tracked file to delete → AskUserQuestion: Delete (Recommended) | Keep; Keep → leave the file and mention it in the Output.
5. **Write** files. Facts `Formatter` not none → run it on written files.
6. **Score.** Spawn `cdk:claude-md-scorer` with: file paths (target memory file, its `@imports`, every file written in step 5, and every `.claude/rules/**/*.md` from facts `Memory files`, so Z1, P2, and E1 see all files), rubric path `${CLAUDE_SKILL_DIR}/rubric.md`, principles path `${CLAUDE_SKILL_DIR}/principles.md`, facts block (answers merged), `Omitted:` list.
7. **Gate.**
   - Score-only → show score + deductions table (criterion, lost pts, fix); write nothing; `Result: done`; go to step 8.
   - Total ≥95 → `Result: done`; go to step 8.
   - <95 and rounds = 3 → `Result: stopped`, `Stopped: 7: below 95 after 3 rounds`; go to step 8 with the remaining gaps.
   - <95 and rounds < 3 → show deductions table (criterion, lost pts, fix), then improve without asking: rounds + 1; apply fixes; fix needs non-derivable fact not omitted → ask first. Write + format (step 5), back to step 6.
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
