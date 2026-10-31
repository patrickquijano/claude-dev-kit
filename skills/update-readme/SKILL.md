---
name: update-readme
description: Creates, updates, or scores a README.md from archetype templates against a 100-point rubric; writes after confirmation. Use when asked to write, improve, or score one.
compatibility: Claude Code only. Uses argument-hint and CLAUDE_SKILL_DIR; claude.ai and API uploads reject unknown frontmatter keys.
argument-hint: '[--yes] [--no-plan] [optional type | score]'
allowed-tools: Bash(git rev-parse *) Bash(git ls-files *) Bash(git remote get-url *) Bash(wc -l *)
---

# Update README

Input: $ARGUMENTS (strip `--yes` and `--no-plan` first)

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `${CLAUDE_SKILL_DIR}/references/commands.md` row.

## Rules

- Host-agnostic: portable Markdown only, per `${CLAUDE_SKILL_DIR}/references/portable.md`.
- Ask (`--yes`: record) what the input and repo cannot answer.
- Flags: `--yes` = unattended (no plan mode, no questions, recommended options, assumptions under `Open:`); `--no-plan` skips plan mode only and every gate is still asked. Only a flag the user passed counts, never add one. `--yes` never covers a destructive step (overwriting a dirty or unnamed file): it is asked, or skipped and listed under `Open:`.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Only this skill asks the user; subagents cannot. The question tool is AskUserQuestion (load it with ToolSearch if deferred); without it, a numbered inline list per `${CLAUDE_SKILL_DIR}/references/flow.md` `## Fallback`. Write unavailable → `Result: stopped`, `Stopped: 11: write unavailable`. A dismissed question → `Result: cancelled` per `${CLAUDE_SKILL_DIR}/references/flow.md` `## Cancelled`.
- License, URLs, versions, and contacts not derivable → ask; user omits → leave out; never re-ask an omitted item. Badges follow `portable.md`.
- Never invent commands, links, versions, or contacts. Every command in the README must exist in the repo (script, Makefile, bin, documented tool); an unverifiable item becomes a `TODO` note, never dropped silently.
- Update mode: keep correct content, custom sections, and author voice; change only stale, wrong, or missing items.
- Never relocate the README. Never delete content: every moved section appears in a linked file.
- Never drop a required section of the rubric. No facts for it → ask in step 6, else write one explicit line ("No configuration.").
- Pass score = 95/100. Only the step 15 improver applies score fixes. Improve rounds capped at 3; the counter starts at 0 and rises each improve round. Then stop and list leftovers in `Open:`.
- Always rescore: after every improve round, including the last one and one whose improver return is malformed, rescore (step 13) with a fresh scorer spawn (or inline). It scores every criterion from the current files; never carry a prior score, its points, or the improver's `Expected:` estimate forward, and never assume a criterion passes. The reported score, the pass check, the stall, and the cap are judged only on that rescore.
- Score-only never writes. Formatter and linter runs prompt for permission; expected.
- Commit nothing; the README and the split files the Confirm lists are the only repo files written (plus the plan file in improve rounds), and only after the step 11 Confirm; each improve round re-enters plan mode (`--no-plan` | `--yes`: skip). `--yes`: `${CLAUDE_SKILL_DIR}/references/flow.md` `## Fallback`.

## Workflow

1. **Pre-flight.** Root = Context → Repo root; `<none>` → cwd. Search for the README per `${CLAUDE_SKILL_DIR}/references/flow.md` `## Pre-flight` and edit it where it is. Relative `.md` links from it to split files belong to the README set and are read too.
2. **Host.** Run `remote-url`; map it per `${CLAUDE_SKILL_DIR}/references/flow.md` `## Host`.
3. **Analyze.** Spawn the `cdk:repo-analyzer` subagent (fallback: a read-only repo analyst subagent) with the repo root, per `${CLAUDE_SKILL_DIR}/references/spawns.md`. Keep its facts block for steps 6, 7, 13.
4. **Detect type.** Read `## Signals` in `${CLAUDE_SKILL_DIR}/references/templates.md`, Glob and Read them against the repo, and score points per type. A tie for the top or all-zero scores → list the signals found inside the step 5 question; all-zero → offer `minimal` plus the partial matches.
5. **Template question.** Input names a type → use it, no question. Else ask per `${CLAUDE_SKILL_DIR}/references/flow.md` `## Questions` with `## Weights` and `## Justifications` from `templates.md`. Stop and wait.
6. **Clarify.** Each analyst `Gaps:` item → one question with an "Omit" option (max 4 per call); record omissions as `Omitted:`.
7. **Draft in memory.** Read `## Required sections` in `${CLAUDE_SKILL_DIR}/references/rubric.md`.
   - Fit existing content into the type's `## Section matrix` and mapped skeleton, in portable syntax; convert existing host syntax per `portable.md`.
   - Preserve user-written text. An unknown fact the user did not omit becomes `TODO`.
   - Verify each kept command and path with Glob, Grep, or facts `Commands`.
   - A draft of 100 lines or more gets a plain link-list ToC after the intro.
8. **Length.** A projection of 200 lines or fewer → max = 200, no question. Above 200 → ask 200 | 400 | 600 per `## Length options` in `${CLAUDE_SKILL_DIR}/references/modularization.md`. Stop and wait.
9. **Modularize.** Projection above the max → ask the layout per `## Layouts` in `modularization.md`; per-package only for monorepo types. Apply `## Split rules`. Stop and wait.
10. **Idempotence.** The draft equals every current file in the README set → skip steps 11 and 12 and go to step 13; `Result: nothing-to-do` when the score is ≥95.
11. **Confirm.** List each file to create or modify (path, create or modify, line count) and each syntax conversion, then ask Yes | No with AskUserQuestion; proceed only on Yes, else `Result: cancelled`. Write the files, then run `format-readme` on each written file when facts `Formatter` is not none.
12. **Verify.** Run `count-lines` on every written file and check every relative link per `${CLAUDE_SKILL_DIR}/references/flow.md` `## Verify`; report both.
13. **Score.** Facts `Visibility: unknown` and `License: none`, not answered → AskUserQuestion: Public | Private | Omit. Score-only treats `Visibility: unknown` as Omit, no question. Spawn the `cdk:rubric-scorer` subagent (fallback: a read-only scorer subagent) per `${CLAUDE_SKILL_DIR}/references/spawns.md` with the README path, split files, rubric path `${CLAUDE_SKILL_DIR}/references/rubric.md`, archetype, facts block (answers merged), and `Omitted:` list.
14. **Report.** Show the score table and deductions (criterion, lost pts, fix). Score-only or total ≥95 → `Result: done`. At the cap with <95 → `Result: stopped`, `Stopped: 14: below 95 after 3 rounds`.
15. **Improve.** Below 95 and rounds <3 → spawn the `cdk:rubric-improver` subagent (fallback: an improver subagent) per `${CLAUDE_SKILL_DIR}/references/spawns.md` and `${CLAUDE_SKILL_DIR}/references/flow.md` `## Improve round`, passing the max, then step 11 format, step 12 verify, step 13 rescore, step 14.
16. **Leftovers.** Always runs, after the loop ends or when step 14 reports `done`: list leftovers per `${CLAUDE_SKILL_DIR}/references/flow.md` `## Leftovers`, then print the Output.

## Files

- For the README search, score-only and non-`.md` pre-flight, host mapping, the fallback, the weighted-question format, verification, the improve round, improve-round plan mode, leftovers, and cancel handling, see `${CLAUDE_SKILL_DIR}/references/flow.md`.
- For the spawn briefs, return blocks, and inline fallbacks (steps 3, 13, 15), see `${CLAUDE_SKILL_DIR}/references/spawns.md`.
- For the evals, see `${CLAUDE_SKILL_DIR}/references/evals.md`.
- For the type signals, section matrix, weights, and justifications (steps 4, 5, 7), see `${CLAUDE_SKILL_DIR}/references/templates.md`.
- For the length options, layouts, split rules, and idempotence (steps 8–10), see `${CLAUDE_SKILL_DIR}/references/modularization.md`.
- For the allowed and banned syntax, the ToC, and badges (step 7), see `${CLAUDE_SKILL_DIR}/references/portable.md`.
- For the runnable commands (repo root, file list, remote URL, formatter, linter, line count), see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For the scoring criteria, N/A rules, and required sections per archetype (steps 7 and 13), see `${CLAUDE_SKILL_DIR}/references/rubric.md`.
- For the README skeleton of the chosen archetype (step 7), read only the one `templates.md` `## Types` maps to the chosen type:
  - `${CLAUDE_SKILL_DIR}/assets/templates/library.md`: for a package published to a registry
  - `${CLAUDE_SKILL_DIR}/assets/templates/cli.md`: for a command-line tool
  - `${CLAUDE_SKILL_DIR}/assets/templates/application.md`: for a deployable app or service
  - `${CLAUDE_SKILL_DIR}/assets/templates/plugin.md`: for a plugin with components and an install step
  - `${CLAUDE_SKILL_DIR}/assets/templates/monorepo.md`: for a repo with several packages
  - `${CLAUDE_SKILL_DIR}/assets/templates/minimal.md`: for a small internal repo needing only purpose, owner, and build
  - `${CLAUDE_SKILL_DIR}/assets/templates/docs.md`: for a documentation-only repo

## Output

```text
Plan mode: entered | already active | declined | skipped (--no-plan | --yes)
README: <path> (created | updated | scored)
Location: <path>
Host: <github | gitlab | bitbucket | gitea | generic>
Template: <type> → <archetype>
Max lines: <n>
Layout: <single | landing+docs | diataxis | per-package>
Split files: <paths | none>
Converted: <syntax conversions | none>
Verify: lines <pass | fail>; links <resolved>/<total>
Score: <n>/100 (pass | below 95) | n/a
Rounds: <improve rounds>
Omitted: <items the user chose to omit | none>
Confirmed: yes | no (stopped) | unattended | n/a (score-only or stopped earlier)
Converted from: <old README path | none>
Open: <criterion (lost pts): fix, ... | none>
Next: commit the README change | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
