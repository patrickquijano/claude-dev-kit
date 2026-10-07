---
name: write-prompt
description: Draft a brief, effective Claude Code prompt from a rough task, or review an existing one, grounded in the repo and checked against common prompt anti-patterns. Prints the prompt in chat; writes no project files. Use when the user asks to write, draft, rewrite, tighten, or review a prompt for Claude Code, or to turn a rough task into a prompt.
argument-hint: '<rough task | existing prompt>'
---

# Write Prompt

Input: $ARGUMENTS

## Rules

- Check every item in `${CLAUDE_SKILL_DIR}/checks.md`; each missed item is a known failure mode for agents.
- Draft in the shape of `${CLAUDE_SKILL_DIR}/structure.md`.
- Derive facts from the repo first (manifests, `CLAUDE.md`, paths, git state); ask only for what the repo cannot answer, so the user is not asked twice.
- Never invent paths, commands, versions, or APIs; unverified → omit and report, since a wrong fact in a prompt misleads the agent.
- Input holds several tasks → draft the first and list the rest as follow-ups.
- Keep the prompt short: omit empty sections, no filler, no repeated facts; token cost repeats every turn.
- Claude Code target only.
- AskUserQuestion unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/fallbacks.md`.
- Loops: clarify (step 3) max 2 batches.
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `write-prompt`.

## Workflow

1. **Analyze.** Input empty → AskUserQuestion for the task. Input is an existing prompt → review it; request is review-only → review-only mode. Extract goal, audience, starting state, target state, files, stack, constraints, prior failures.
2. **Ground.** Read repo facts that fill extracted gaps: stack and versions from manifests, test/lint commands, relevant paths. Confirm named paths, commands, and versions exist, in the input prompt too. Review-only → walk checks.md against the input prompt, with each unverified fact as a failed check; print the review-only Output, `Result: done`, stop.
3. **Clarify.** Remaining gaps (target state, success criteria, scope, review triggers, prior failures) → AskUserQuestion, ≤4 per batch, 2–4 options each, recommended first with "(Recommended)" and reason. Repeat until every check passes or is n/a; max 2 batches, then draft and list open gaps. Existing prompt → also fix each failed check.
4. **Draft** per structure.md.
5. **Check.** Walk checks.md against the draft; fix each failure.
6. **Report.** Print the Output, `Result: done`; no approval asked, since nothing is written.

## Output

````text
```markdown
<drafted prompt>
```
Checks n/a: <list or none>
Open gaps: <list or none>
Follow-ups: <split-off tasks or none>
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
````

Review-only:

```text
Failed checks: <check — fix>, … | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
