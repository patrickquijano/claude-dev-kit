---
name: write-readme
description: Create, update, or score a repository README.md using best-practice templates (library, CLI, application, plugin, monorepo, minimal, docs) and a 100-point rubric (pass ≥95), iterating improvements with user confirmation. Use only when the user explicitly asks to write, generate, create, rewrite, update, improve, review, audit, or score a README, e.g. "write a README", "update the README", "improve my README", "score my README". Do not use on your own after finishing a task.
argument-hint: '[optional archetype | score]'
allowed-tools: Bash(git rev-parse *)
disable-model-invocation: true
---

# Write README

Input: $ARGUMENTS

## Rules

- User interaction (AskUserQuestion) only here; subagents can't ask.
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/fallbacks.md`.
- Never invent facts: license, URLs, versions, contacts, badges. Not derivable → ask; user omits → leave out.
- Every command in README must exist in repo (scripts, Makefile, bin, documented tool). Unverified → drop.
- Update mode: keep correct content, custom sections, author voice. Change only stale, wrong, or missing items.
- Never drop a rubric required section. No facts for it → ask in step 3, else write one explicit line ("No configuration.").
- Pass score = 95/100. Improve rounds max 3; the round counter starts at 0 and increments each time the user picks Improve (step 7). Revise (step 4) runs until the user picks Write or Stop. Never re-ask an omitted item.
- Score-only never writes; only an explicit Switch to update mode (step 7), Switch to create mode, or Convert to README.md (step 1) answer leaves score-only.
- Formatter and linter runs prompt for permission; expected.
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `write-readme`.

## Workflow

1. **Pre-flight.** Root = `git rev-parse --show-toplevel`; fail → cwd. Find `README*` at root, case-insensitive.
   - Input `score` or request is score/review/audit only → score-only: steps 2, 6, 7, skip the mode bullets below; before step 6, AskUserQuestion to confirm archetype: analyzer guess (Recommended) + 2–3 from `Alternatives`. No README.md → tell user score-only needs README.md. Only non-`.md` README (`README`, `README.rst`, …) → AskUserQuestion: Convert to README.md (Recommended) | Stop; Convert → leave score-only; continue as the Convert bullet below without re-asking. No README at all → AskUserQuestion: Switch to create mode | Stop. Stop → end, `Result: nothing-to-do`.
   - `README.md` found → update mode.
   - Only non-`.md` README (`README`, `README.rst`, …) → AskUserQuestion: Convert to README.md (Recommended) | Leave it, stop. Leave it, stop → end, `Result: nothing-to-do`. Convert → update mode on its content converted to Markdown; after step 5, AskUserQuestion: Keep old (Recommended) | Delete old.
   - None → create mode.
2. **Analyze.** Spawn `cdk:readme-analyzer` with root. Keep facts block for steps 3, 4, 6.
3. **Clarify.** Nothing to ask → skip.
   - Archetype: input names one → use it. Else analyzer guess "(Recommended)" + 2–3 from `Alternatives`.
   - Each analyzer `Gaps:` item → one question; always include "Omit" option. Order: gaps behind required sections, then license/visibility/contact, then rest.
   - Max 4 per AskUserQuestion; more → second call. Record omitted items as `Omitted:` list.
4. **Draft.** Read `## Required sections` from `${CLAUDE_SKILL_DIR}/rubric.md`.
   - Create → read `${CLAUDE_SKILL_DIR}/templates/<archetype>.md`. Fill `{{...}}` from facts and answers. Apply each `<!-- -->` instruction, then strip it. Drop optional sections with no content.
   - Update → read README. Map to archetype sections. Fix facts `Stale` items, add missing required sections. Keep order unless it breaks structure.
   - Final ≥100 lines → ToC after intro from final H2 list. <100 → no ToC.
   - Show outline (headings) + changed/added sections → AskUserQuestion: Write (Recommended) | Revise | Stop. Revise → apply feedback, re-show. Stop → end, `Result: cancelled`.
5. **Write** `README.md` at root. Facts `Formatter` not none → run it on README.
6. **Score.** Facts `Visibility: unknown`, `License: none`, not answered or omitted → AskUserQuestion: Public | Private | Omit; merge answer into facts. Spawn `cdk:readme-scorer` with: README path, rubric path `${CLAUDE_SKILL_DIR}/rubric.md`, archetype, facts block (with answers merged), `Omitted:` list.
7. **Gate.**
   - Score-only → show score + deductions table (criterion, lost pts, fix); write nothing. AskUserQuestion: Done (Recommended) | Switch to update mode. Done → print the Output, `Result: done`. Switch to update mode → leave score-only; go to step 3 in update mode, then steps 4–7.
   - Total ≥95 → print the Output, `Result: done`.
   - <95 and rounds = 3 → print the Output with remaining gaps, `Result: stopped`, `Stopped: 7: below 95 after 3 rounds`.
   - <95 and rounds < 3 → show deductions table (criterion, lost pts, fix). AskUserQuestion: Improve (Recommended) | Stop. Stop → print the Output, `Result: stopped`, `Stopped: 7: user stopped below 95`. Improve → rounds + 1; apply fixes; fix needs non-derivable fact not omitted → ask first. Write + format (step 5), back to step 6.

## Output

```text
README: <path> (created | updated | scored)
Archetype: <archetype>
Score: <n>/100 (pass | below 95)
Rounds: <improve rounds>
Remaining gaps: <criterion list or none>
Omitted: <items the user chose to omit | none>
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
