---
name: write-prompt
description: Draft a brief, effective Claude Code prompt from a rough task, or review an existing one, grounded in the repo and checked against common prompt anti-patterns. Prints the prompt in chat; writes no project files. Use when the user asks to write, draft, rewrite, tighten, or review a prompt for Claude Code, or to turn a rough task into a prompt.
argument-hint: '<rough task | existing prompt>'
---

# Write Prompt

Input: $ARGUMENTS

## Rules

- Check every item in `${CLAUDE_SKILL_DIR}/references/checks.md`; each missed item is a known failure mode for agents.
- Draft in the shape of `${CLAUDE_SKILL_DIR}/references/structure.md`.
- Derive facts from the repo first (manifests, `CLAUDE.md`, paths, git state); ask only for what the repo cannot answer, so the user is not asked twice.
- Never invent paths, commands, versions, or APIs; unverified → omit and report, since a wrong fact in a prompt misleads the agent.
- Input holds several tasks → draft the first and list the rest as follow-ups.
- Keep the prompt short: omit empty sections, no filler, no repeated facts; token cost repeats every turn.
- Claude Code target only.
- AskUserQuestion unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/references/fallbacks.md`.
- Loops: clarify (step 3) max 2 batches.
- Final step: follow `${CLAUDE_SKILL_DIR}/../build-skill/references/resolve-findings.md` (scope: ask-only, it prints only and writes no files; sources: `Open gaps:`, `Failed checks:`).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/references/known-issues.md` with slug `write-prompt` and store `${CLAUDE_PLUGIN_DATA}/known-issues`.

## Workflow

1. **Analyze.** Input empty → AskUserQuestion for the task. Input is an existing prompt → review it; request is review-only → review-only mode. Extract goal, audience, starting state, target state, files, stack, constraints, prior failures.
2. **Ground.** Read repo facts that fill extracted gaps: stack and versions from manifests, test/lint commands, relevant paths. Confirm named paths, commands, and versions exist, in the input prompt too. Review-only → walk checks.md against the input prompt, with each unverified fact as a failed check; `Result: done`; go to step 6, then print the review-only Output and stop.
3. **Clarify.** Remaining gaps → AskUserQuestion in batches (max 2), then draft and list open gaps. Detail: `${CLAUDE_SKILL_DIR}/references/clarify.md`.
4. **Draft** per structure.md.
5. **Check.** Walk checks.md against the draft; fix each failure.
6. **Resolve findings.** Per resolve-findings.md. Itemize each `Open gaps:` entry (draft) or `Failed checks:` entry (review-only); the step never re-enters the clarify loop and asks only for a choice step 3 did not already offer.
7. **Report.** Print the Output, `Result: done`; no approval asked, since nothing is written.

## Output

````text
```markdown
<drafted prompt>
```
Checks n/a: <list or none>
Open gaps: <list or none>
Follow-ups: <split-off tasks or none>
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
````

Review-only:

```text
Failed checks: <check — fix>, … | none
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
