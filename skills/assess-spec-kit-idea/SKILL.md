---
name: assess-spec-kit-idea
description: Assess an idea with the GitHub Spec Kit assess extension before building it. Extract the idea from the input, then chain speckit-assess-intake, research, define, shape, and decide under one slug. A go verdict hands the decision.md handoff summary to run-spec-kit (handoff=no stops at go instead); needs-clarification re-runs the named stage after the user answers; kill stops. Use only when the user explicitly asks to assess, evaluate, or vet an idea with Spec Kit. Do not use on your own after finishing a task.
argument-hint: '<idea text | URL | ticket | codebase pointer> [handoff=no]'
---

# Assess Spec Kit Idea

Input: $ARGUMENTS

## Rules

- Follow `${CLAUDE_SKILL_DIR}/../setup-spec-kit/speckit-chain.md` with prefix `speckit-assess-` and groups core and `assess`.
- Pass `slug=<slug>` to every step after intake. All five commands share the slug and write only to `.specify/assessments/<slug>/`.
- Pre-approved exceptions to relaying questions: accept the slug intake suggests (step 3); during step 7 re-runs only, answer yes to overwriting artifacts in the current slug; on the first pass relay overwrite prompts, since the slug may hold an earlier assessment.
- `handoff=no` in the input (any position) → strip it from the idea; a go verdict then stops at step 6 without invoking run-spec-kit. Default: hand off.
- Clarify loop (step 7): max 2 re-runs, then stop.
- Chaining `cdk:run-spec-kit`: follow `${CLAUDE_SKILL_DIR}/../ship-changes/orchestration.md`.
- AskUserQuestion unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/fallbacks.md`.
- Chained by other skills via the Skill tool; never set `disable-model-invocation: true` (it blocks that invocation).
- Final step: follow `${CLAUDE_SKILL_DIR}/../build-skill/resolve-findings.md` (scope: ask-only; sources: `Next: blocking questions open` (list the questions), `Verdict: unknown`).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `assess-spec-kit-idea`.

## Workflow

1. **Pre-flight.** Run the speckit-chain pre-flight for core and `assess`; core is checked now so a go handoff to run-spec-kit does not fail after the assessment. Input empty (after stripping `handoff=no`) → AskUserQuestion for the idea.
2. **Extract** the idea: what it is, who asked, and any URLs, tickets, or codebase paths. Keep URLs verbatim; intake fetches them under its own trust policy. No idea found → AskUserQuestion for one. User gives none or cancels a question → `Result: cancelled`, `Stopped: <step>: user cancelled`, report, stop. Show the idea in one or two lines.
3. **Intake.** Run `speckit-assess-intake <idea>`. Intake asks for a slug and suggests one; accept the suggestion. Take the slug from its `Slug:` line.
4. **Research, define, shape.** Run `speckit-assess-research slug=<slug>`, then `speckit-assess-define slug=<slug>`, then `speckit-assess-shape slug=<slug>`.
5. **Decide.** Run `speckit-assess-decide slug=<slug>`. Read the `**Verdict**` line in `.specify/assessments/<slug>/decision.md`. File missing or verdict not `go`, `needs-clarification`, or `kill` → `Verdict: unknown`, `Result: stopped`, `Stopped: Decide: verdict unknown`, then step 8, stop.
   - `go` → step 6.
   - `needs-clarification` → step 7.
   - `kill` → show the decisive reason from `## Verdict & Rationale`, report the output below with `Result: done`, `Resolution: none`, end.
6. **Hand off.** Read the section whose heading starts with `## If go`, up to the next `##` heading. Section missing → `Next: none`, `Result: stopped`; run step 8 on the items the assessment left (open questions or risks in `decision.md`) without re-entering any loop, then print the Output with `Stopped: Hand off: no If go section` and end; none left → `Resolution: none`. `handoff=no` → `Next: handoff ready`, `Result: done`, `Resolution: none`, report, end. Else report the output below first, since run-spec-kit output would bury it, then invoke the `cdk:run-spec-kit` skill via the Skill tool with that section body verbatim as its argument; run-spec-kit owns the rest, including its post-converge review of open items.
7. **Clarify.** 2 re-runs done → list the blocking questions, `Result: stopped`, `Stopped: Clarify: 2 re-runs, blocking questions open`, then step 8, stop; repeated blocks point to missing evidence only the user can gather. Else show the `**Blocking questions**` and `**Revisit stage**` from `decision.md`. Collect answers with AskUserQuestion, one question per blocking question, each with a Stop option (free text via Other). Answers → run `speckit-assess-<revisit stage> slug=<slug> <answers>` (intake also gets the idea from step 2), run every later stage through decide with `slug=<slug>`, then read the verdict again as in step 5. Any Stop → `Result: stopped`; run step 8 on the blocking questions still open without re-asking them or re-entering step 7, then print the Output with `Stopped: Clarify: user stopped` and end.
8. **Resolve findings.** Per resolve-findings.md, once when the run ends with blocking questions open (list each question with its recommended answer path and who acts) or `Verdict: unknown`, including the step 5, 6, and 7 stops above, then print the Output with `Stopped:`; it never re-runs step 7, so the user is not asked again. A `go` or `kill` verdict with a handoff has no items; a step 2 cancel prints `Resolution: not run (cancelled)`.

## Output

```text
Assessment: .specify/assessments/<slug>/
Verdict: go | needs-clarification | kill | unknown (<re-runs> re-run(s))
Next: run-spec-kit started | handoff ready | blocking questions open | closed (<decisive reason>) | none
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)
Result: done | stopped | cancelled
Stopped: <step>: <reason> | none
```
