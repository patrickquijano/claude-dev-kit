---
name: run-spec-kit
description: Run the full GitHub Spec Kit cycle from one feature brief. Split the brief into guiding principles, what and why, and implementation detail, then chain the speckit skills (constitution, specify, clarify, plan, checklist, tasks, analyze, implement, converge) without a gate before implementation, then address unchecked checklist items, open findings, and other open items over up to 5 rounds. Use only when the user explicitly asks to build or implement a feature with Spec Kit or to run the whole spec-driven development cycle, or when assess-spec-kit-idea hands off a go verdict. Do not use on your own after finishing a task.
argument-hint: '<feature brief>'
---

# Run Spec Kit

Input: $ARGUMENTS

## Rules

- Follow `${CLAUDE_SKILL_DIR}/../setup-spec-kit/speckit-chain.md` with prefix `speckit-` and group core.
- Pre-approved exceptions to relaying questions: accept the analyze remediation offer (step 9), and answer yes to the implement checklist prompt in every round (step 10); open checklist items are addressed after converge instead.
- Loops: analyze runs at most twice (step 9); implement, converge, address runs at most 5 rounds (step 10), one `cdk:speckit-open-items` agent per round, re-spawned at most once per round after it returns `Question:`.
- The agent only finds and classifies open items and proposes approaches; this skill owns every AskUserQuestion, edit, `tasks.md` change, and speckit call.
- Chained by other skills via the Skill tool; never set `disable-model-invocation: true` (it blocks that invocation).
- Final step: follow `${CLAUDE_SKILL_DIR}/../build-skill/resolve-findings.md` (scope: edit; sources: `Open:` items, `Addressed:` skipped, `Analyze:` open, `Implement: not converged`).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `run-spec-kit`.

## Workflow

1. **Pre-flight.** Run the speckit-chain pre-flight for core; missing core dirs → also name `specify integration install claude` as an alternative. Input empty → AskUserQuestion for the feature brief.
2. **Extract** three parts from the input: guiding principles, what and why (user-facing behavior and goals), implementation detail (tech stack, architecture, technical constraints). What and why missing → AskUserQuestion for it; `speckit-specify` needs it. Implementation detail missing → plan infers it from the repo, no ask. User gives no what and why or cancels a question → `Result: cancelled`, `Stopped: <step>: user cancelled`, report, stop. Show the three parts in a short list.
3. **Constitution.** Read `.specify/memory/constitution.md`. Unfilled means the file is missing or has placeholder tokens matching `\[[A-Z0-9_]+\]`.
   - Unfilled, principles extracted → run `speckit-constitution <principles>`.
   - Unfilled, no principles → infer from the repo, no ask: run `speckit-constitution` with no argument; plan checks against the constitution, so placeholders weaken that check.
   - Filled, extracted principles add to or conflict with it → update, no ask: run `speckit-constitution <principles>`.
   - Filled, principles already covered or none → skip.
4. **Specify.** Run `speckit-specify <what-and-why>`. Take the feature directory from its report. A git hook created a branch → tell the user the branch name.
5. **Clarify.** `speckit-specify` already asks about its own `[NEEDS CLARIFICATION` markers, so check what is left: `spec.md` still has markers, or `checklists/requirements.md` has unchecked items → run `speckit-clarify <marker topics and unchecked items>`. Else skip.
6. **Plan.** Run `speckit-plan <implementation-detail>`; empty argument when implementation detail is missing.
7. **Checklist.** Run `speckit-checklist <domain>`: the one or two words naming the area the what-and-why part mostly concerns (e.g. `ux`, `api`, `security`, `performance`).
8. **Tasks.** Run `speckit-tasks`.
9. **Analyze.** Run `speckit-analyze`. Findings with remediations → accept its remediation offer; analyze is read-only, so this skill applies the edits to `spec.md`, `plan.md`, and `tasks.md`, then run `speckit-analyze` once more to confirm. Findings left after the second run → list them, CRITICAL first, and carry them into step 10; implementation proceeds without a gate.
10. **Implement, converge, address.** Run up to 5 rounds; keep a skip list and a fixed-awaiting-check list for the session. Each round: run `speckit-implement`, then `speckit-converge`, then address open items per `${CLAUDE_SKILL_DIR}/addressing.md`, which spawns `cdk:speckit-open-items` and decides whether to continue, finish, or stop. Stopped after 5 rounds → list the open items and unchecked tasks; repeated misses point to a spec or plan problem.
11. **Resolve findings.** Per resolve-findings.md, once after step 10, including after a stop in it; the step itemizes the `Analyze:` and `Addressed:` counts and the agent's per-item approaches (its Recommended fix; `addressing.md` is not re-run, and ask nothing for items it already offered: report them `open`). Edit only spec and feature files this run wrote, limited to wording or clarity fixes validated by one extra `speckit-analyze` outside the step 9 cap (otherwise the item stays `open`); skipped CRITICAL items and checklist items the user skipped stay `accepted`; code, task, or meaning-changing edits stay `needs-decision`.

## Output

```text
Feature: specs/<feature> (branch <name> | no branch)
Constitution: created | updated | inferred | unchanged
Clarify: ran | skipped
Analyze: <first-run findings> found, <remediated> remediated, <left after second run> open
Implement: <rounds> round(s), converged | not converged (<k> tasks left)
Addressed: <fixed> fixed, <skipped> skipped (<c> of them CRITICAL), <open> open
Open: none | items below, one per line
  <open item or unchecked task; CRITICAL findings prefixed `CRITICAL:`>
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)
Result: done | stopped | cancelled
Stopped: <step>: <reason> | none
```
