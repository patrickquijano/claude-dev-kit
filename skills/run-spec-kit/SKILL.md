---
name: run-spec-kit
description: Runs the full GitHub Spec Kit cycle from one feature brief: chains the speckit skills from constitution through implement and converge, then resolves open items over up to 5 rounds. Use only when the user explicitly asks to build a feature with Spec Kit, or when assess-spec-kit-idea hands off a go verdict. Do not use on your own after finishing a task.
argument-hint: '<feature brief>'
---

# Run Spec Kit

Input: $ARGUMENTS

## Rules

- Invoke each speckit skill with the Skill tool as `speckit-<command>`, in this main thread, never via the Agent tool (a subagent has no AskUserQuestion). One at a time, in the order below; wait for each to finish.
- Relay every question a speckit skill asks to the user with AskUserQuestion; never invent answers. Pre-approved exceptions: accept the analyze remediation offer (step 9), and answer yes to the implement checklist prompt in every round (step 10); open checklist items are addressed after converge instead.
- Never edit `.specify/` templates or `.claude/skills/speckit-*/`; Spec Kit overwrites them on upgrade.
- Loops: analyze runs at most twice (step 9); implement, converge, address runs at most 5 rounds (step 10), one `cdk:speckit-open-items` agent per round, re-spawned at most once per round after it returns `Question:`.
- The agent only finds and classifies open items and proposes approaches; this skill owns every AskUserQuestion, edit, `tasks.md` change, and speckit call.
- AskUserQuestion unavailable: ask as plain text with options, end the turn, and take the next message as the answer. Chained or unattended: ask nothing; take the Recommended option.
- Chained by other skills via the Skill tool; never set `disable-model-invocation: true` (it blocks that invocation).
- Leftovers (open items, skipped findings, unconverged tasks) go to `Open:` with the agent's recommended fix; code, task, or meaning-changing edits are never made without the user's choice.

## Workflow

1. **Pre-flight.** `.specify/` missing, or any dir in `${CLAUDE_SKILL_DIR}/references/required-skills.md` missing under `.claude/skills/` → name what is missing, tell the user to run `/cdk:setup-spec-kit` (or `specify integration install claude`), stop. Input empty → AskUserQuestion for the feature brief.
2. **Extract** three parts from the input: guiding principles, what and why (user-facing behavior and goals), implementation detail (tech stack, architecture, technical constraints). What and why missing → AskUserQuestion; `speckit-specify` needs it. Implementation detail missing → plan infers it from the repo, no ask. No what and why or a cancelled question → `Result: cancelled`, `Stopped: <step>: user cancelled`, stop. Show the three parts in a short list.
3. **Constitution.** Read `.specify/memory/constitution.md`; unfilled = missing or has placeholder tokens matching `\[[A-Z0-9_]+\]`.
   - Unfilled, principles extracted → run `speckit-constitution <principles>`.
   - Unfilled, no principles → run `speckit-constitution` with no argument (infers from the repo, no ask).
   - Filled, principles add to or conflict with it → update, no ask: `speckit-constitution <principles>`.
   - Filled, principles covered or none → skip.
4. **Specify.** Run `speckit-specify <what-and-why>`. Take the feature directory from its report. A git hook created a branch → tell the user its name.
5. **Clarify.** `spec.md` still has `[NEEDS CLARIFICATION` markers, or `checklists/requirements.md` has unchecked items → run `speckit-clarify <marker topics and unchecked items>`. Else skip.
6. **Plan.** Run `speckit-plan <implementation-detail>`; empty argument when it is missing.
7. **Checklist.** Run `speckit-checklist <domain>`: one or two words for the area the what-and-why mostly concerns (e.g. `ux`, `api`, `security`).
8. **Tasks.** Run `speckit-tasks`.
9. **Analyze.** Run `speckit-analyze`. Findings with remediations → accept its offer; it is read-only, so apply the edits to `spec.md`, `plan.md`, `tasks.md` here, then run it once more. Findings left → list them, CRITICAL first, and carry them into step 10; implementation proceeds without a gate.
10. **Implement, converge, address.** Up to 5 rounds; keep a skip list and a fixed-awaiting-check list. Each round: `speckit-implement`, `speckit-converge`, then `${CLAUDE_SKILL_DIR}/references/addressing.md`. Stopped after 5 rounds → list open items and unchecked tasks; repeated misses point to a spec or plan problem.
11. **Report.** Put everything left (step 9 findings, skipped items, unchecked tasks) in `Open:`, CRITICAL first, each with its recommended fix; print the Output.

## Files

- For the core speckit skill dirs the pre-flight checks (step 1), see `${CLAUDE_SKILL_DIR}/references/required-skills.md`.
- For the per-round address procedure and the agent input (step 10), see `${CLAUDE_SKILL_DIR}/references/addressing.md`.

## Output

```text
Feature: specs/<feature> (branch <name> | no branch)
Constitution: created | updated | inferred | unchanged
Clarify: ran | skipped
Analyze: <first-run findings> found, <remediated> remediated, <left after second run> open
Implement: <rounds> round(s), converged | not converged (<k> tasks left)
Addressed: <fixed> fixed, <skipped> skipped (<c> of them CRITICAL), <open> open
Open: none | items below, one per line
  <open item or unchecked task; CRITICAL prefixed `CRITICAL:`; recommended fix>
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
