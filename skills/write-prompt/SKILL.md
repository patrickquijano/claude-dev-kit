---
name: write-prompt
description: Draft a brief, effective Claude Code prompt from a rough task, or review an existing one, grounded in the repo and checked against common prompt anti-patterns. Prints the prompt in chat; writes no project files. Use when the user asks to write, draft, rewrite, tighten, or review a prompt for Claude Code, or to turn a rough task into a prompt.
argument-hint: '<rough task | existing prompt>'
---

# Write Prompt

Input: $ARGUMENTS

## Rules

- Check every item in [checks.md](checks.md); each missed item is a known failure mode for agents.
- Derive facts from the repo first (manifests, `CLAUDE.md`, paths, git state); ask only for what the repo cannot answer, so the user is not asked twice.
- Never invent paths, commands, versions, or APIs; unverified → ask or omit, since a wrong fact in a prompt misleads the agent.
- Input holds several tasks → AskUserQuestion which one first; list the rest as follow-ups.
- Keep the prompt short: omit empty sections, no filler, no repeated facts; token cost repeats every turn.
- Claude Code target only; no image-model advice.
- Issue → check `## Known issues` first. Fix for a recurring or workflow-blocking issue → append `- <symptom> → <fix>` to source SKILL.md (repo path, not plugin cache); not writable → print line for user.

## Workflow

1. **Analyze.** Input empty → AskUserQuestion for the task. Input is an existing prompt → list failed checks with fixes; review-only request → print them, stop. Extract goal, audience, starting state, target state, files, stack, constraints, prior failures.
2. **Ground.** Read repo facts that fill extracted gaps: stack and versions from manifests, test/lint commands, relevant paths. Confirm named paths exist.
3. **Clarify.** Remaining gaps (target state, success criteria, scope, review triggers, prior failures) → AskUserQuestion, ≤4 per batch, 2–4 options each, recommended first with "(Recommended)" and reason. Repeat until every check passes or is n/a; max 2 batches, then draft and list open gaps.
4. **Draft** with the structure below.
5. **Check.** Walk checks.md against the draft; fix each failure. Print the output below.
6. **Approve.** AskUserQuestion: Accept (Recommended) | Revise. Revise → collect change, back to step 4.

## Prompt structure

```markdown
Role: <one line>

Context: <project, stack + versions, starting state, prior failures>

Task: <one verb + target state>

Scope: <in-scope paths>. Do not touch <out-of-scope>. Allowed commands: <list>.

Constraints: <keep X; no new dependencies; ground facts in code/docs, say "unknown" if unsure>

Done when: <verifiable checks, e.g. `npm test` passes>

Stop and ask before: <review triggers>. Stop after 3 failed attempts and report.

Output: <format, audience, length bound>. Report at <checkpoints>; list assumptions. <Multi-slice: log progress to <file>.>
```

## Output

````text
```markdown
<drafted prompt>
```
Checks n/a: <list or none>
Open gaps: <list or none>
Follow-ups: <split-off tasks or none>
````

## Known issues

- none
