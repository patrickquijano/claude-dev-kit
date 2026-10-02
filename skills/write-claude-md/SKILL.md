---
name: write-claude-md
description: Create, update, or score a project's CLAUDE.md and .claude/rules/*.md from input guidelines plus existing memory files, using bundled Claude Code best practices and a 100-point rubric (pass ≥95), iterating improvements with user confirmation. Use only when the user explicitly asks to write, update, merge, improve, audit, or score CLAUDE.md or project rules, e.g. "update CLAUDE.md", "merge these guidelines into CLAUDE.md", "improve my project rules", "score my CLAUDE.md". Do not use on your own after finishing a task.
argument-hint: '[guidelines text | file paths | score]'
allowed-tools: Bash(git rev-parse *)
disable-model-invocation: true
---

# Write CLAUDE.md

Input: $ARGUMENTS

## Rules

- User interaction (AskUserQuestion) only here; subagents can't ask.
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/fallbacks.md`.
- Best practices + rubric: `${CLAUDE_SKILL_DIR}/rubric.md`. Skeletons: `${CLAUDE_SKILL_DIR}/template.md`.
- Write scope: project `CLAUDE.md` (or `.claude/CLAUDE.md` when that is the existing one) and `.claude/rules/**/*.md`. Never write `CLAUDE.local.md`, `~/.claude/**`, managed policy.
- Never invent commands, paths, or policies. Not derivable → ask; user omits → leave out, add to `Omitted:`.
- Update mode: keep correct content, author voice, every Known issues entry. Change only stale, wrong, duplicate, conflicting, or missing items.
- Conflict → never resolve silently; ask.
- Pass score = 95/100. Improve rounds max 3; the round counter starts at 0 and increments each time the user picks Improve (step 7). Revise (step 4) runs until the user picks Write or Stop. Never re-ask an omitted item.
- Score-only never writes; only an explicit Switch to update mode (step 7) or Switch to create mode (step 1) answer leaves score-only.
- Formatter runs prompt for permission; expected.
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `write-claude-md`.

## Workflow

1. **Pre-flight.** Root = `git rev-parse --show-toplevel`; fail → cwd.
   - `CLAUDE.md` or `.claude/CLAUDE.md` exists → update mode. Both exist → AskUserQuestion which to keep as target.
   - None → create mode, target `CLAUDE.md`. Existing `.claude/rules/` files → edit in place, never re-template.
   - Input `score` or request is score/audit only → score-only: steps 2, 6, 7. No target file → tell user; AskUserQuestion: Switch to create mode | Stop. Stop → end, `Result: nothing-to-do`.
   - Split input: existing file paths → `Input files:`; rest → `Input text:`.
2. **Analyze.** Spawn `cdk:claude-md-analyzer` with root, `Target:`, `Input files:`, `Input text:`. Keep facts block.
3. **Combine.** Merge input + existing instructions per facts `Instructions`.
   - `derivable` → drop. `duplicate` → keep copy in file placement rules assign, drop others. List dropped items for step 4.
   - `stale` → fix from facts `Commands`/paths; no match → ask. `vague` → rewrite from facts; else ask with "Omit" option.
   - Each facts `Conflicts:` item → one question: keep A | keep B | merge; recommend input (newer) unless it breaks a verified fact. One side unwritable (`CLAUDE.local.md`, ancestor) → options: override in project file (name winner) | keep unwritable side; say it can't be edited.
   - Each facts `Gaps:` item (architecture, precedence, boundaries, focused changes, done, maintenance) → one question with "Omit" option. Precedence → offer template order as "(Recommended)".
   - Max 4 per AskUserQuestion; more → next call. Record omitted items as `Omitted:` list. Nothing to ask → skip.
4. **Draft.** Create → fill `${CLAUDE_SKILL_DIR}/template.md`. Update → edit existing files in place. Place each instruction per rubric `## Placement rules`.
   - Always-loaded non-blank lines stay <200; overflow → move component guidance to path-scoped rules.
   - Show file list (new | changed | deleted), outline per file, dropped and moved items, suggested hooks for hard requirements → AskUserQuestion: Write (Recommended) | Revise | Stop. Revise → apply feedback, re-show. Stop → end, `Result: cancelled`.
5. **Write** files. Facts `Formatter` not none → run it on written files.
6. **Score.** Spawn `cdk:claude-md-scorer` with: file paths (target memory file, its `@imports`, and every `.claude/rules/**/*.md` from facts `Memory files`, so Z1 and P2 see all files), rubric path `${CLAUDE_SKILL_DIR}/rubric.md`, facts block (answers merged), `Omitted:` list.
7. **Gate.**
   - Score-only → show score + deductions table (criterion, lost pts, fix); write nothing. AskUserQuestion: Done (Recommended) | Switch to update mode. Done → print the Output, `Result: done`. Switch to update mode → leave score-only; go to step 3 in update mode, then steps 4–7.
   - Total ≥95 → print the Output, `Result: done`.
   - <95 and rounds = 3 → print the Output with remaining gaps, `Result: stopped`, `Stopped: 7: below 95 after 3 rounds`.
   - <95 and rounds < 3 → show deductions table (criterion, lost pts, fix). AskUserQuestion: Improve (Recommended) | Stop. Stop → print the Output, `Result: stopped`, `Stopped: 7: user stopped below 95`. Improve → rounds + 1; apply fixes; fix needs non-derivable fact not omitted → ask first. Write + format (step 5), back to step 6.

## Output

```text
Files: <path — created | updated | deleted | scored, ...>
Always-loaded lines: <n, from scorer Z1 evidence>
Score: <n>/100 (pass | below 95)
Rounds: <improve rounds>
Remaining gaps: <criterion list or none>
Omitted: <items the user chose to omit | none>
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
