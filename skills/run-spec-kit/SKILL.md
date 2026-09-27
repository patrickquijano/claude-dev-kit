---
name: run-spec-kit
description: Run the full GitHub Spec Kit cycle from one feature brief. Split the brief into guiding principles, what and why, and implementation detail, then chain the speckit skills (constitution, specify, clarify, plan, checklist, tasks, analyze, implement, converge) with one review gate before implementation. Use only when the user explicitly asks to build or implement a feature with Spec Kit or to run the whole spec-driven development cycle, or when assess-spec-kit-idea hands off a go verdict. Do not use on your own after finishing a task.
argument-hint: '<feature brief>'
---

# Run Spec Kit

Input: $ARGUMENTS

## Rules

- Invoke each step with the Skill tool as `speckit-<command>`, one at a time, in order. Wait for each step to finish before the next; speckit skills do not chain themselves.
- Relay every question a speckit skill asks to the user with AskUserQuestion. Never invent answers; the spec must reflect the user's intent. Exceptions, pre-approved by this workflow: accept the analyze remediation offer (step 9), and answer yes to the implement checklist prompt after the gate (step 11).
- Never edit `.specify/` templates or `.claude/skills/speckit-*/`; Spec Kit overwrites them on upgrade.
- Issue → check `## Known issues` first. Fix for a recurring or workflow-blocking issue → append `- <symptom> → <fix>` to source SKILL.md (repo path, not plugin cache); not writable → print line for user.

## Workflow

1. **Preflight.** `.specify/` missing → tell the user to run `/cdk:setup-spec-kit` first, stop. Any of `.claude/skills/speckit-{constitution,specify,clarify,plan,checklist,tasks,analyze,implement,converge}/` missing → name the missing ones, tell the user to run `/cdk:setup-spec-kit` (or `specify integration install claude`), stop; a partial chain fails after it has written files. Input empty → AskUserQuestion for the feature brief.
2. **Extract** three parts from the input: guiding principles, what and why (user-facing behavior and goals), implementation detail (tech stack, architecture, technical constraints). What and why missing → ask; `speckit-specify` needs it. Implementation detail missing → AskUserQuestion: Let plan infer from the repo (Recommended) | Provide now. Show the three parts in a short list.
3. **Constitution.** Read `.specify/memory/constitution.md`. Unfilled means the file is missing or has placeholder tokens matching `\[[A-Z0-9_]+\]`.
   - Unfilled, principles extracted → run `speckit-constitution <principles>`.
   - Unfilled, no principles → AskUserQuestion: Infer from the repo (Recommended) | Skip; plan checks against the constitution, so placeholders weaken that check. Infer → run `speckit-constitution` with no argument.
   - Filled, extracted principles add to or conflict with it → AskUserQuestion: Update constitution (Recommended) | Keep. Update → run `speckit-constitution <principles>`.
   - Filled, principles already covered or none → skip.
4. **Specify.** Run `speckit-specify <what-and-why>`. Take the feature directory from its report. A git hook created a branch → tell the user the branch name.
5. **Clarify.** `speckit-specify` already asks about its own `[NEEDS CLARIFICATION` markers, so check what is left: `spec.md` still has markers, or `checklists/requirements.md` has unchecked items → run `speckit-clarify <marker topics and unchecked items>`. Else skip.
6. **Plan.** Run `speckit-plan <implementation-detail>`; empty argument when the user chose to let plan infer.
7. **Checklist.** Run `speckit-checklist <main domain of the brief>`.
8. **Tasks.** Run `speckit-tasks`.
9. **Analyze.** Run `speckit-analyze`. Findings with remediations → accept its remediation offer, apply the edits to `spec.md`, `plan.md`, and `tasks.md`, then run `speckit-analyze` once more to confirm. Findings left after the second run → list them; carry CRITICAL ones to the gate.
10. **Gate.** Implementation writes code, so confirm first. Summarize requirement and task counts, open findings, and unchecked items per file in `checklists/` (implement flags them). AskUserQuestion: Implement | Stop. Mark Implement (Recommended) when no CRITICAL finding is open, else Stop (Recommended); analyze says to resolve CRITICAL findings before implementing. Stop → report the output below, end.
11. **Implement and converge.** One pass = `speckit-implement`, then `speckit-converge`. Converge reports converged → done. Not converged and fewer than 3 passes done → run another pass. 3 passes done → stop and list the unchecked tasks in `tasks.md`; repeated misses point to a spec or plan problem.

## Output

```text
Feature: specs/<feature> (branch <name> | no branch)
Constitution: created | updated | inferred | unchanged | skipped
Clarify: ran | skipped
Analyze: <first-run findings> found, <remediated> remediated, <left after second run> open
Implement: <passes> pass(es), converged | not converged (<k> tasks left) | stopped at gate
```

## Known issues

- none
