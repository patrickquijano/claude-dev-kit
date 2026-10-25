---
name: update-readme
description: Creates, updates, or scores a README.md from archetype templates against a 100-point rubric; confirms first. Use only when the user explicitly asks to write, improve, or score one.
compatibility: Claude Code only. Uses argument-hint, disable-model-invocation and CLAUDE_SKILL_DIR; claude.ai and API uploads reject unknown frontmatter keys.
argument-hint: '[optional archetype | score]'
allowed-tools: Bash(git rev-parse *) Bash(git ls-files *) Bash(git remote get-url *)
disable-model-invocation: true
---

# Update README

Input: $ARGUMENTS

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `${CLAUDE_SKILL_DIR}/references/commands.md` row.

## Rules

- Ask (unattended: record) what the input and repo cannot answer.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Only this skill asks the user; subagents cannot. AskUserQuestion unavailable: see `${CLAUDE_SKILL_DIR}/references/flow.md` `## Fallback`. Write unavailable → `Result: stopped`, `Stopped: 5: write unavailable`. A dismissed question → `Result: cancelled` per `${CLAUDE_SKILL_DIR}/references/flow.md` `## Cancelled`.
- License, URLs, versions, contacts, and badges not derivable → ask; user omits → leave out; never re-ask an omitted item.
- Every command in the README must exist in the repo (script, Makefile, bin, documented tool). Unverified → drop.
- Update mode: keep correct content, custom sections, and author voice; change only stale, wrong, or missing items.
- Never drop a required section of the rubric. No facts for it → ask in step 3, else write one explicit line ("No configuration.").
- Pass score = 95/100. Only the step 8 improver applies score fixes. Improve rounds capped at 3; the counter starts at 0 and rises each improve round. Then stop and list leftovers in `Open:`.
- Score-only never writes. Formatter and linter runs prompt for permission; expected.
- Commit nothing; the README is the only file written, and only after the step 5 confirm (it also covers this run's improve rounds; unattended: `${CLAUDE_SKILL_DIR}/references/flow.md` `## Fallback`).

## Workflow

1. **Pre-flight.** Root = Context → Repo root; `<none>` → cwd. Find `README*` at root, case-insensitive. `README.md` → update; none → create; score-only and non-`.md` cases: `${CLAUDE_SKILL_DIR}/references/flow.md` `## Pre-flight`.
2. **Analyze.** Spawn a read-only repo analyst subagent with the repo root, per `${CLAUDE_SKILL_DIR}/references/spawns.md`. Keep its facts block for steps 3, 4, 6.
3. **Clarify.** Archetype: input names one → use it, else the analyst guess, no question. Each analyst `Gaps:` item → one question with an "Omit" option (max 4 per call); record omissions as `Omitted:`.
4. **Draft.** Read `## Required sections` in `${CLAUDE_SKILL_DIR}/references/rubric.md`.
   - Create → fill the archetype template (`## Files`) from facts and answers; apply then strip each `<!-- -->` instruction; drop empty optional sections.
   - Update → map the README to archetype sections; fix `Stale` facts, add missing required sections, keep order.
   - Final ≥100 lines → ToC after the intro; shorter → none.
5. **Write.** Print archetype, outline, and changed sections, ask per `${CLAUDE_SKILL_DIR}/references/flow.md` `## Confirm`, then on Proceed write `README.md` at root. Facts `Formatter` not none → run `format-readme`.
6. **Score.** Facts `Visibility: unknown` and `License: none`, not answered → AskUserQuestion: Public | Private | Omit. Score-only treats `Visibility: unknown` as Omit, no question. Spawn a read-only scorer subagent per `${CLAUDE_SKILL_DIR}/references/spawns.md` with the README path, rubric path `${CLAUDE_SKILL_DIR}/references/rubric.md`, archetype, facts block (answers merged), and `Omitted:` list.
7. **Report.** Show the score table and deductions (criterion, lost pts, fix). Score-only or total ≥95 → `Result: done`. At the cap with <95 → `Result: stopped`, `Stopped: 7: below 95 after 3 rounds`.
8. **Improve.** Below 95 and rounds <3 → spawn an improver subagent per `${CLAUDE_SKILL_DIR}/references/spawns.md` and `${CLAUDE_SKILL_DIR}/references/flow.md` `## Improve round`, then step 5 format, step 6 rescore, step 7.
9. **Leftovers.** Always runs, after the loop ends or when step 7 reports `done`: list leftovers per `${CLAUDE_SKILL_DIR}/references/flow.md` `## Leftovers`, then print the Output.

## Files

- For score-only and non-`.md` pre-flight, the unattended fallback, the write confirm, the improve round, leftovers, and cancel handling, see `${CLAUDE_SKILL_DIR}/references/flow.md`.
- For the spawn briefs, return blocks, and inline fallbacks (steps 2, 6, 8), see `${CLAUDE_SKILL_DIR}/references/spawns.md`.
- For the evals, see `${CLAUDE_SKILL_DIR}/references/evals.md`.
- For the runnable commands (repo root, file list, formatter, linter), see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For the scoring criteria, N/A rules, and required sections per archetype (steps 4 and 6), see `${CLAUDE_SKILL_DIR}/references/rubric.md`.
- For the README skeleton of the chosen archetype (create mode, step 4), read only the matching one:
  - `${CLAUDE_SKILL_DIR}/assets/templates/library.md`: for a package published to a registry
  - `${CLAUDE_SKILL_DIR}/assets/templates/cli.md`: for a command-line tool
  - `${CLAUDE_SKILL_DIR}/assets/templates/application.md`: for a deployable app or service
  - `${CLAUDE_SKILL_DIR}/assets/templates/plugin.md`: for a plugin with components and an install step
  - `${CLAUDE_SKILL_DIR}/assets/templates/monorepo.md`: for a repo with several packages
  - `${CLAUDE_SKILL_DIR}/assets/templates/minimal.md`: for a small internal repo needing only purpose, owner, and build
  - `${CLAUDE_SKILL_DIR}/assets/templates/docs.md`: for a documentation-only repo

## Output

```text
README: <path> (created | updated | scored)
Archetype: <archetype>
Score: <n>/100 (pass | below 95) | n/a
Rounds: <improve rounds>
Omitted: <items the user chose to omit | none>
Confirmed: yes | revised <n> | no (stopped) | unattended | n/a (score-only or stopped earlier)
Converted from: <old README path | none>
Open: <criterion (lost pts): fix, ... | none>
Next: commit the README change | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
