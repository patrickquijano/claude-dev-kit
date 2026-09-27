---
name: write-readme
description: Create, update, or score a repository README.md using best-practice templates (library, CLI, application, plugin, monorepo, minimal, docs) and a 100-point rubric (pass ≥95), iterating improvements with user confirmation. Use only when the user explicitly asks to write, generate, create, rewrite, update, improve, review, audit, or score a README, e.g. "write a README", "update the README", "improve my README", "score my README". Do not use on your own after finishing a task.
argument-hint: '[optional archetype | score]'
allowed-tools: Bash(git rev-parse *)
---

# Write README

Input: $ARGUMENTS

## Rules

- User interaction (AskUserQuestion) only here; subagents can't ask.
- Never invent facts: license, URLs, versions, contacts, badges. Not derivable → ask; user omits → leave out.
- Every command in README MUST exist in repo (scripts, Makefile, bin, documented tool). Unverified → drop.
- Update mode: keep correct content, custom sections, author voice. Change only stale, wrong, or missing items.
- Never drop a rubric required section. No facts for it → ask in step 3, else write one explicit line ("No configuration.").
- Pass score = 95/100. Improve rounds max 3. Never re-ask an omitted item.
- Formatter and linter runs prompt for permission; expected.
- Issue → check `## Known issues` first. Fix for a recurring or workflow-blocking issue → append `- <symptom> → <fix>` to source file (repo path, not plugin cache): skill issue → this SKILL.md; subagent "Known issue:" line → that agent's file in `agents/`. Not writable → print line for user.

## Workflow

1. Pre-flight. Root = `git rev-parse --show-toplevel`; fail → cwd. Find `README*` at root, case-insensitive.
   - `README.md` found → update mode.
   - Only non-`.md` README (`README`, `README.rst`, …) → AskUserQuestion: Convert to README.md (Recommended) | Leave it, stop.
   - None → create mode.
   - Input `score` or request is score/review/audit only, README.md exists → score-only: steps 2, 6, 7.
2. Analyze. Spawn `cdk:readme-analyzer` with root. Keep facts block for steps 3, 4, 6.
3. Clarify. Nothing to ask → skip.
   - Archetype: input names one → use it. Else analyzer guess "(Recommended)" + 2–3 from `Alternatives`.
   - Each analyzer `Gaps:` item → one question; always include "Omit" option. Order: gaps behind required sections, then license/visibility/contact, then rest.
   - Max 4 per AskUserQuestion; more → second call. Record omitted items as `Omitted:` list.
4. Draft. Read `## Required sections` from `${CLAUDE_SKILL_DIR}/rubric.md`.
   - Create → read `${CLAUDE_SKILL_DIR}/templates/<archetype>.md`. Fill `{{...}}` from facts and answers. Apply each `<!-- -->` instruction, then strip it. Drop optional sections with no content.
   - Update → read README. Map to archetype sections. Fix facts `Stale` items, add missing required sections. Keep order unless it breaks structure.
   - Final ≥100 lines → ToC after intro from final H2 list. <100 → no ToC.
   - Show outline (headings) + changed/added sections → AskUserQuestion: Write (Recommended) | Revise. Revise → apply feedback, re-show.
5. Write `README.md` at root. Facts `Formatter` not none → run it on README.
6. Score. Spawn `cdk:readme-scorer` with: README path, rubric path `${CLAUDE_SKILL_DIR}/rubric.md`, archetype, facts block (with answers merged), `Omitted:` list.
7. Gate.
   - Total ≥95 → done.
   - <95 → show deductions table (criterion, lost pts, fix). AskUserQuestion: Improve (Recommended) | Stop. Improve → apply fixes; fix needs non-derivable fact not omitted → ask first. Write README, back to step 6.
   - 3 improve rounds done, still <95 → stop, report remaining gaps.

## Output

```text
README: <path> (created | updated | scored)
Archetype: <archetype>
Score: <n>/100 (pass | below 95)
Rounds: <improve rounds>
Remaining gaps: <criterion list or none>
```

## Known issues

- none
