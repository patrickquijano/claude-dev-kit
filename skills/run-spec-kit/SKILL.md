---
name: run-spec-kit
description: Runs the full GitHub Spec Kit cycle from one feature brief through implement and converge, then resolves open items. Use only when the user explicitly asks to build with Spec Kit.
compatibility: Claude Code only. Uses argument-hint, disable-model-invocation and CLAUDE_SKILL_DIR; claude.ai and API uploads reject unknown frontmatter keys.
argument-hint: '[--yes] [--no-plan] <feature brief>'
disable-model-invocation: true
---

# Run Spec Kit

Input: $ARGUMENTS (strip `--yes` and `--no-plan` first)

## Rules

- Ask (unattended: record) what the input and repo cannot answer.
- Flags: `--yes` = unattended: no plan mode, no questions, recommended options taken, assumptions under `Open:` (the unattended rules below apply); `--no-plan` skips plan mode only and every gate and question is still asked. Only a flag the user passed counts; never add one. `--yes` never covers a destructive step (admin-bypass merge, force-push, branch delete, `git reset --hard`, overwriting a dirty or unnamed file): it is still asked, and when nobody can answer it is skipped and listed under `Open:`.
- The only spawn is the open-items classifier of step 10, the `cdk:speckit-open-items-analyzer` subagent (fallback: a read-only subagent that classifies open items).
- Invoke each speckit skill (a third-party skill installed by `specify init`) with the Skill tool as `speckit-<command>`, in this main thread, never via the Agent tool (a subagent has no AskUserQuestion). One at a time, in the order below; wait for each to finish.
- Relay every question a speckit skill asks to the user with AskUserQuestion. Pre-approved exceptions: accept the analyze remediation offer for non-CRITICAL findings only (step 9), and answer yes to the implement checklist prompt in every round (step 10); open checklist items are addressed after converge instead.
- Never switches branches; a branch that the Spec Kit git hook created is reported, never made here.
- Never edit `.specify/` templates or third-party `.claude/skills/speckit-*/`; Spec Kit overwrites them on upgrade.
- Loops: analyze runs at most twice (step 9); implement, converge, address runs at most 5 rounds (step 10), one classifier per round, re-spawned at most once per round after it returns `Question:`.
- The classifier only finds and classifies open items and proposes approaches; this skill owns every AskUserQuestion, edit, `tasks.md` change, and speckit call.
- Plan mode (each batch of edits): this skill edits `spec.md`, `plan.md`, `tasks.md`, and code only after a plan approval per batch (step 9 remediations; each round's fixes). Before applying, call EnterPlanMode (load it with ToolSearch if deferred; already active → write to its plan file). Put each edit (cause, chosen fix) and its file in the plan, then ExitPlanMode. Apply only what was approved. Rejection → revise and call ExitPlanMode again, at most 3 times → `Result: cancelled`, `Stopped: <step>: plan rejected`. `--no-plan` or `--yes` → skip this plan mode and apply the edits. Declined, unavailable, or unattended without a flag → no fix is applied; the items go under `Open:` with the classifier's recommended fix. The constitution is written by third-party `speckit-constitution` (step 3), which the user's invocation covers.
- AskUserQuestion unavailable: ask as plain text with options, end the turn, and take the next message as the answer. Unattended (`--yes`, or no AskUserQuestion): ask nothing; take the Recommended option.
- Leftovers (open items, skipped findings, unconverged tasks) go to `Open:` with the classifier's recommended fix. CRITICAL items are never edited without the user's choice (unattended: left in `Open:`); non-CRITICAL items follow `addressing.md` step 4.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.

## Workflow

0. **Plan mode.** `--no-plan` or `--yes` → skip it. Otherwise enter plan mode first (load `EnterPlanMode` with ToolSearch if deferred; already active → stay in it); read-only steps run inside it. Before creating, editing, or deleting any file or running any side-effect action, present the plan and wait for `ExitPlanMode` approval. Declined or unavailable → `Result: stopped`, `Stopped: 0: plan mode declined`; nothing is written.
1. **Pre-flight.** `.specify/` missing, or any dir in `${CLAUDE_SKILL_DIR}/references/required-skills.md` missing under `.claude/skills/` → name what is missing, tell the user to install Spec Kit (`specify init`, or `specify integration install claude`; row `install-claude` in `commands.md`, never run here), `Result: stopped`, `Stopped: pre-flight: Spec Kit not set up`, stop. Input empty → AskUserQuestion for the feature brief; unattended → `Result: stopped`, `Stopped: pre-flight: feature brief missing`, stop.
2. **Extract** three parts from the input: guiding principles, what and why (user-facing behavior and goals), implementation detail (tech stack, architecture, technical constraints). What and why missing → AskUserQuestion; third-party `speckit-specify` needs it. Implementation detail missing → plan infers it from the repo, no ask. No what and why or a cancelled question → `Result: cancelled`, `Stopped: <step>: user cancelled`, stop. Show the three parts in a short list.
3. **Constitution.** Read `.specify/memory/constitution.md`; unfilled = missing or has placeholder tokens matching `\[[A-Z0-9_]+\]`.
   - Unfilled, principles extracted → run third-party `speckit-constitution <principles>`.
   - Unfilled, no principles → run third-party `speckit-constitution` with no argument (infers from the repo, no ask).
   - Filled, principles add to or conflict with it → update, no ask: third-party `speckit-constitution <principles>`.
   - Filled, principles covered or none → skip.
4. **Specify.** Run third-party `speckit-specify <what-and-why>`. Take the feature directory from its report. A git hook created a branch → tell the user its name.
5. **Clarify.** `spec.md` still has `[NEEDS CLARIFICATION` markers, or `checklists/requirements.md` has unchecked items → run third-party `speckit-clarify <marker topics and unchecked items>`. Else skip.
6. **Plan.** Run third-party `speckit-plan <implementation-detail>`; empty argument when it is missing.
7. **Checklist.** Run third-party `speckit-checklist <domain>`: one or two words for the area the what-and-why mostly concerns (e.g. `ux`, `api`, `security`).
8. **Tasks.** Run third-party `speckit-tasks`.
9. **Analyze.** Run third-party `speckit-analyze`. Non-CRITICAL findings with remediations → accept its offer; it is read-only, so apply those edits to `spec.md`, `plan.md`, `tasks.md` here after the plan mode approval (Rules), then run it once more. CRITICAL and other findings left → list them, CRITICAL first, and carry them into step 10 (`addressing.md` step 4 decides them); implementation proceeds without a gate.
10. **Implement, converge, address.** Up to 5 rounds; keep a skip list and a fixed-awaiting-check list. Each round: third-party `speckit-implement`, `speckit-converge`, then `${CLAUDE_SKILL_DIR}/references/addressing.md`. Stopped after 5 rounds → list open items and unchecked tasks; repeated misses point to a spec or plan problem.
11. **Report.** Put everything left (step 9 findings, skipped items, unchecked tasks) in `Open:`, CRITICAL first, each with its recommended fix; print the Output.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For the core speckit skill dirs the pre-flight checks (step 1), see `${CLAUDE_SKILL_DIR}/references/required-skills.md`.
- For test scenarios, see `${CLAUDE_SKILL_DIR}/references/evals.md`.
- For the per-round address procedure, classifier brief, and classify fallback (step 10), see `${CLAUDE_SKILL_DIR}/references/addressing.md`.
- For the grill table, anchors, and sensitivity rule, read `${CLAUDE_SKILL_DIR}/references/grill.md` when step 4 Choose of `references/addressing.md` asks a decision question.

## Output

```text
Feature: specs/<feature> (branch <name> | no branch)
Constitution: created | updated | inferred | unchanged
Clarify: ran | skipped
Analyze: <first-run findings> found, <remediated> remediated, <left after second run> open
Implement: <rounds> round(s), converged | not converged (<k> tasks left)
Plan mode: <rounds entered> | declined | n/a | skipped (--no-plan | --yes)
Addressed: <fixed> fixed, <skipped> skipped (<c> of them CRITICAL), <open> open
Open: none | items below, one per line
  <open item or unchecked task; CRITICAL prefixed `CRITICAL:`; recommended fix>
Next: none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
