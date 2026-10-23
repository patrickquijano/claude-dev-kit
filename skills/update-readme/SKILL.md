---
name: update-readme
description: Creates, updates, or scores a README.md from archetype templates against a 100-point rubric, improving up to 3 rounds. Use only when the user explicitly asks to write, improve, or score a README.
argument-hint: '[optional archetype | score]'
allowed-tools: Bash(git rev-parse *)
---

# Update README

Input: $ARGUMENTS

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `commands.md` row.

## Rules

- Rigor: never guess or invent: confirm each path, command, and fact by reading it; ask (unattended: record) what the input and repo cannot answer. Finish every step in full, think twice before each irreversible step, and re-check the result against these rules and the repo's standards before reporting.
- Efficiency: read only what a step needs, keep output terse, and take the fewest steps that meet the goal; when work is autonomous and splits cleanly, spawn independent cdk subagents in one parallel turn (`cdk:task-worker` for read-only work, `cdk:plan-implementer` for edits), never `Explore` or `general-purpose`; each spawn gets a complete brief (agent, kind, literal inputs, scope, return block; missing or ambiguous → `Question:`, never assume).
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Only this skill asks the user; subagents cannot. AskUserQuestion or Write unavailable: see `flow.md` `## Fallback`.
- License, URLs, versions, contacts, and badges not derivable → ask; user omits → leave out; never re-ask an omitted item.
- Every command in the README must exist in the repo (script, Makefile, bin, documented tool). Unverified → drop.
- Update mode: keep correct content, custom sections, and author voice; change only stale, wrong, or missing items.
- Never drop a required section of the rubric. No facts for it → ask in step 3, else write one explicit line ("No configuration.").
- Pass score = 95/100. Only `cdk:rubric-improver` applies score fixes. Improve rounds capped at 3; the counter starts at 0 and rises each improve round. Then stop and list leftovers in `Open:`.
- Score-only never writes. Formatter and linter runs prompt for permission; expected.
- Commit nothing; the README is the only file written.

## Workflow

1. **Pre-flight.** Root = Context → Repo root; `<none>` → cwd. Find `README*` at root, case-insensitive. `README.md` → update; none → create; score-only and non-`.md` cases: `${CLAUDE_SKILL_DIR}/references/flow.md` `## Pre-flight`.
2. **Analyze.** Spawn `cdk:repo-analyzer` with `kind: readme` and the repo root. Keep its facts block for steps 3, 4, 6.
3. **Clarify.** Archetype: input names one → use it, else the analyzer guess, no question. Each analyzer `Gaps:` item → one question with an "Omit" option (max 4 per call); record omissions as `Omitted:`.
4. **Draft.** Read `## Required sections` in `${CLAUDE_SKILL_DIR}/references/rubric.md`.
   - Create → fill the archetype template (`## Files`) from facts and answers; apply then strip each `<!-- -->` instruction; drop empty optional sections.
   - Update → map the README to archetype sections; fix `Stale` facts, add missing required sections, keep order.
   - Final ≥100 lines → ToC after the intro; shorter → none.
5. **Write.** Print archetype, outline, and changed sections; write `README.md` at root without asking. Facts `Formatter` not none → `format-readme`.
6. **Score.** Facts `Visibility: unknown` and `License: none`, not answered → AskUserQuestion: Public | Private | Omit. Spawn `cdk:rubric-scorer` with: `kind: readme`, README path, rubric path `${CLAUDE_SKILL_DIR}/references/rubric.md`, archetype, facts block (answers merged), `Omitted:` list.
7. **Report.** Show the score table and deductions (criterion, lost pts, fix). Score-only or total ≥95 → `Result: done`. At the cap with <95 → `Result: stopped`, `Stopped: 7: below 95 after 3 rounds`.
8. **Improve.** Below 95 and rounds <3 → spawn `cdk:rubric-improver` (`kind: readme`) per `${CLAUDE_SKILL_DIR}/references/flow.md` `## Improve round`, then step 5 format, step 6 rescore, step 7.
9. **Leftovers.** Always runs, after the loop ends or when step 7 reports `done`: list leftovers per `${CLAUDE_SKILL_DIR}/references/flow.md` `## Leftovers`, then print the Output.

## Files

- For score-only and non-`.md` pre-flight, the unattended fallback, the improve round, leftovers, and spawn briefs, see `${CLAUDE_SKILL_DIR}/references/flow.md`.
- For the runnable commands (repo root, formatter), see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For the scoring criteria, N/A rules, and required sections per archetype (steps 4 and 6), see `${CLAUDE_SKILL_DIR}/references/rubric.md`.
- For the README skeleton of the chosen archetype (create mode, step 4), read one of:
  - `${CLAUDE_SKILL_DIR}/assets/templates/library.md`
  - `${CLAUDE_SKILL_DIR}/assets/templates/cli.md`
  - `${CLAUDE_SKILL_DIR}/assets/templates/application.md`
  - `${CLAUDE_SKILL_DIR}/assets/templates/plugin.md`
  - `${CLAUDE_SKILL_DIR}/assets/templates/monorepo.md`
  - `${CLAUDE_SKILL_DIR}/assets/templates/minimal.md`
  - `${CLAUDE_SKILL_DIR}/assets/templates/docs.md`

## Output

```text
README: <path> (created | updated | scored)
Archetype: <archetype>
Score: <n>/100 (pass | below 95)
Rounds: <improve rounds>
Omitted: <items the user chose to omit | none>
Open: <criterion (lost pts): fix, ... | none>
Next: /cdk:commit-changes | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
