---
name: draft-prompt
description: Drafts a brief, effective prompt from a rough task, or reviews one, grounded in the repo and checked for anti-patterns; prints it in chat. Use when the user asks to write, tighten, or review a prompt.
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
- Claude Code target only. Nothing is written to disk, so no approval is asked.
- AskUserQuestion unavailable (or unattended run): ask nothing, pick the recommended option, draft, and list the gap in `Open gaps:`.
- Loops: clarify (step 3) max 2 batches; the check-and-fix pass (step 5) max 3 rounds. Anything still failing → `Open gaps:` (draft) or `Failed checks:` (review-only), never silently dropped.

## Workflow

1. **Analyze.** Input empty → AskUserQuestion for the task. Existing prompt → review it; review-only request → review-only mode. Extract goal, audience, start and target state, files, stack, constraints, prior failures.
2. **Ground.** Read repo facts that fill the gaps (manifests, test and lint commands, paths); confirm every named path, command, and version exists, in the input prompt too.
3. **Clarify.** Gaps remain → AskUserQuestion, ≤4 questions per batch, 2–4 options each, recommended first with "(Recommended)" and the reason. Max 2 batches, then continue. Review-only mode skips this step.
4. **Draft** per structure.md. Review-only mode: walk checks.md against the input prompt instead, each unverified fact a failed check, then go to step 6.
5. **Check.** Walk checks.md against the draft; fix each failure and re-walk, up to 3 rounds.
6. **Report.** Print the Output; for a draft, `Open gaps:` lists what no step could fill.

## Files

- For the anti-pattern checks each prompt must pass, see `${CLAUDE_SKILL_DIR}/references/checks.md` (steps 2, 4, 5).
- For the prompt template to draft into, see `${CLAUDE_SKILL_DIR}/references/structure.md` (step 4).

## Output

````text
```markdown
<drafted prompt>
```
Checks n/a: <list or none>
Open gaps: <list or none>
Follow-ups: <split-off tasks or none>
Next: /cdk:implement-goal to build it | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
````

Review-only:

```text
Failed checks: <check — fix>, … | none
Open: <unverified facts or unresolved items, or none>
Next: /cdk:implement-goal to build it | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
