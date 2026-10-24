---
name: update-rules
description: Creates, updates, or scores a project's CLAUDE.md and .claude/rules against a 100-point rubric, merging input guidelines. Use only when the user explicitly asks to write, improve, or score them.
compatibility: Claude Code only. Uses argument-hint, disable-model-invocation and CLAUDE_SKILL_DIR; claude.ai and API uploads reject unknown frontmatter keys.
argument-hint: '[guidelines text | file paths | score]'
allowed-tools: Bash(git rev-parse *)
disable-model-invocation: true
---

# Update Rules

Input: $ARGUMENTS

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `commands.md` row.

## Rules

- Rigor: never guess or invent: confirm each path, command, and fact by reading it; ask (unattended: record) what the input and repo cannot answer. Finish every step in full, think twice before each irreversible step, and re-check the result against these rules and the repo's standards before reporting.
- Efficiency: read only what a step needs, keep output terse, and take the fewest steps that meet the goal; when work is autonomous and splits cleanly, spawn independent cdk subagents in one parallel turn (`cdk:task-worker` for read-only work, `cdk:plan-implementer` for edits), never `Explore` or `general-purpose`; each spawn gets a complete brief (agent, kind, literal inputs, scope, return block; missing or ambiguous → `Question:`, never assume).
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Only this skill asks the user (AskUserQuestion); subagents cannot. AskUserQuestion or Write unavailable → ask the pending question as plain text with its options and end the turn; never print finished files in place of a pending question.
- Best practices and rubric: `${CLAUDE_SKILL_DIR}/references/rubric.md`. Skeletons: `${CLAUDE_SKILL_DIR}/assets/template.md`.
- Apply `${CLAUDE_SKILL_DIR}/references/principles.md` by default in create and update mode, adapted to facts and repo conventions, so every generated set carries engineering principles without the user asking.
- Write scope: project `CLAUDE.md` (or `.claude/CLAUDE.md` when that is the existing one) and `.claude/rules/**/*.md`. Never write `CLAUDE.local.md`, `~/.claude/**`, or managed policy. Exception: the auto-memory directory (`~/.claude/projects/<project>/memory/`) takes only the `Known issues` move below (a `feedback` memory plus its `MEMORY.md` pointer), never other edits.
- Commands, paths, and policies not derivable → ask; user omits → leave out, add to `Omitted:`; never re-ask an omitted item.
- Update mode: keep correct content and author voice; change only stale, wrong, duplicate, conflicting, or missing items. Move any `Known issues` section to auto memory (`feedback` memory plus `MEMORY.md` pointer), then remove it; auto memory unavailable → keep it and report it.
- Conflict → never resolve silently; ask.
- Unattended (no way to ask): ask nothing; a conflict keeps the existing side, an ambiguous target is `CLAUDE.md`, a deletion is Keep, and an unanswerable gap goes to `Omitted:` (or `Open:` for score deductions).
- Pass score = 95/100. Improve rounds max 3 (counter starts at 0, +1 per improve round); only `cdk:rubric-improver` applies score fixes. Never loop past the cap; list what is left in `Open:`.
- Score-only never writes. Formatter runs prompt for permission; expected.

## Workflow

1. **Pre-flight.** Root = Context → Repo root; `<none>` → cwd. `CLAUDE.md` or `.claude/CLAUDE.md` exists → update (both → ask which is the target); none → create, target `CLAUDE.md`. Existing `.claude/rules/` files are edited in place, never re-templated.
   - Input `score` or an audit-only request → score-only: steps 2, 6, 7, 9. No target file → `Result: nothing-to-do`, suggest create mode.
   - Split input: existing file paths → `Input files:`; the rest → `Input text:`.
2. **Analyze.** Spawn `cdk:repo-analyzer` with `kind: instructions`, `model: sonnet`, root, `Target:`, `Input files:`, `Input text:`; keep its facts block.
3. **Combine.** Merge input and existing instructions per facts `Instructions`; ask conflicts and gaps (max 4 per call). Detail: `${CLAUDE_SKILL_DIR}/references/flow.md` `## Combine`.
4. **Draft.** Create → fill `assets/template.md`; update → edit in place. Place each instruction per rubric `## Placement rules` and principles per `principles.md` `## Placement`. Always-loaded non-blank lines stay <200; overflow → path-scoped rules.
   - Show file list (new | changed | deleted), outline, dropped and moved items (including a `Known issues` move), suggested hooks; write without asking and print each diff. Tracked file to delete → ask Delete (Recommended) | Keep.
5. **Write.** Write the files; for a planned `Known issues` move also write the `feedback` memory and its `MEMORY.md` pointer in the existing auto-memory directory (path read from it, never guessed; none found → keep the section and report it), and list both paths in `Files:`. Then run `format-files`.
6. **Score.** Spawn `cdk:rubric-scorer` with `kind: project-instructions` per `flow.md` `## Scorer input`.
7. **Report.** Show the score table and deductions (criterion, lost pts, fix). Score-only or ≥95 → `Result: done`. At the cap with <95 → `Result: stopped`, `Stopped: 7: below 95 after 3 rounds`.
8. **Improve.** <95 and rounds <3 → spawn `cdk:rubric-improver` (`kind: project-instructions`) per `flow.md` `## Improve`, then `format-files`, step 6 rescore, step 7.
9. **Leftovers.** List each leftover deduction in `Open:` with its fix; print the Output.

## Files

- For combine rules, the scorer input, the improve loop, and spawn briefs, see `${CLAUDE_SKILL_DIR}/references/flow.md`.
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
Next: /cdk:commit-changes | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
