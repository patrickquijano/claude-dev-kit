---
name: write-readme
description: Create, update, or score a repository README.md using best-practice templates (library, CLI, application, plugin, monorepo, minimal, docs) and a 100-point rubric (pass ≥95), iterating improvements up to 3 rounds. Use only when the user explicitly asks to write, generate, create, rewrite, update, improve, review, audit, or score a README, e.g. "write a README", "update the README", "improve my README", "score my README". Do not use on your own after finishing a task.
argument-hint: '[optional archetype | score]'
allowed-tools: Bash(git rev-parse *)
---

# Write README

Input: $ARGUMENTS

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

A Context value of `<none>` means that read failed. A missing value or `[shell command execution disabled by policy]` means run that command's `commands.md` row instead.

## Rules

- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- User interaction (AskUserQuestion) only here; subagents can't ask.
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/../shared/references/fallbacks.md`.
- Never invent facts: license, URLs, versions, contacts, badges. Not derivable → ask; user omits → leave out.
- Every command in README must exist in repo (scripts, Makefile, bin, documented tool). Unverified → drop.
- Update mode: keep correct content, custom sections, author voice. Change only stale, wrong, or missing items.
- Never drop a rubric required section. No facts for it → ask in step 3, else write one explicit line ("No configuration.").
- Pass score = 95/100. Improve rounds max 3; the round counter starts at 0 and increments each improve round (step 7). Never re-ask an omitted item.
- Score-only never writes; only an explicit Convert to README.md (step 1) answer leaves score-only.
- Formatter and linter runs prompt for permission; expected.
- Final step: follow `${CLAUDE_SKILL_DIR}/../shared/references/resolve-findings.md` (scope: edit, the target README only; sources: `Remaining gaps:` scorer deductions).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../shared/references/known-issues.md` with slug `write-readme` and store `${CLAUDE_PLUGIN_DATA}/known-issues`.

## Workflow

1. **Pre-flight.** Root = Context → Repo root; `<none>` → cwd. Find `README*` at root, case-insensitive.
   - Input `score` or request is score/review/audit only → score-only: steps 2, 6, 7, 8. Detail: `${CLAUDE_SKILL_DIR}/references/preflight.md`.
   - `README.md` found → update mode.
   - Only non-`.md` README → AskUserQuestion Convert or leave. Detail: `${CLAUDE_SKILL_DIR}/references/preflight.md`.
   - None → create mode.
2. **Analyze.** Spawn `cdk:readme-analyzer` with root. Keep facts block for steps 3, 4, 6.
3. **Clarify.** Nothing to ask → skip.
   - Archetype: input names one → use it. Else analyzer guess, no question.
   - Each analyzer `Gaps:` item → one question; always include "Omit" option. Order: gaps behind required sections, then license/visibility/contact, then rest.
   - Max 4 per AskUserQuestion; more → second call. Record omitted items as `Omitted:` list.
4. **Draft.** Read `## Required sections` from `${CLAUDE_SKILL_DIR}/references/rubric.md`.
   - Create → read `${CLAUDE_SKILL_DIR}/assets/templates/<archetype>.md`. Fill `{{...}}` from facts and answers. Apply each `<!-- -->` instruction, then strip it. Drop optional sections with no content.
   - Update → read README. Map to archetype sections. Fix facts `Stale` items, add missing required sections. Keep order unless it breaks structure.
   - Final ≥100 lines → ToC after intro from final H2 list. <100 → no ToC.
   - Print archetype (analyzer Alternatives, if any), outline (headings), and changed/added sections, then write without asking.
5. **Write** `README.md` at root. Facts `Formatter` not none → run it on README.
6. **Score.** Facts `Visibility: unknown`, `License: none`, not answered or omitted → AskUserQuestion: Public | Private | Omit; merge answer into facts. Spawn `cdk:readme-scorer` with: README path, rubric path `${CLAUDE_SKILL_DIR}/references/rubric.md`, archetype, facts block (with answers merged), `Omitted:` list.
7. **Gate.**
   - Score-only → show score + deductions table (criterion, lost pts, fix); write nothing; `Result: done`; go to step 8.
   - Total ≥95 → `Result: done`; go to step 8.
   - <95 and rounds = 3 → `Result: stopped`, `Stopped: 7: below 95 after 3 rounds`; go to step 8 with the remaining gaps.
   - <95 and rounds < 3 → show deductions table, then improve without asking. Detail: `${CLAUDE_SKILL_DIR}/references/improve.md`.
8. **Resolve findings.** Per resolve-findings.md. Itemize each `Remaining gaps:` deduction (criterion, lost pts, scorer fix as Recommended fix); the step never re-enters the improve loop. Score-only → report and ask only (writes nothing). Then print the Output.

## Output

```text
README: <path> (created | updated | scored)
Archetype: <archetype>
Score: <n>/100 (pass | below 95)
Rounds: <improve rounds>
Remaining gaps: <criterion list or none>
Omitted: <items the user chose to omit | none>
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
