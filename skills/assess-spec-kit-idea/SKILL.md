---
name: assess-spec-kit-idea
description: Vets an idea with Spec Kit's assess extension, returning go, needs-clarification, or kill; on go, asks before building. Use only when the user explicitly asks to vet an idea with Spec Kit.
argument-hint: '<idea text | URL | ticket | codebase pointer> [handoff=no]'
---

# Assess Spec Kit Idea

Input: $ARGUMENTS

## Rules

- Rigor: never guess or invent: confirm each path, command, and fact by reading it; ask (unattended: record) what the input and repo cannot answer. Re-check the result against these rules before reporting.
- Efficiency: read only what a step needs and keep output terse. No step spawns an agent.
- Run each speckit step with the Skill tool in this main thread, one at a time, never via the Agent tool (a subagent has no AskUserQuestion). Wait for each to finish; speckit skills do not chain themselves.
- Relay every question a speckit skill asks with AskUserQuestion. Pre-approved exceptions: accept the slug intake suggests (step 3); in step 7 re-runs only, answer yes to overwriting artifacts in the current slug. On the first pass relay overwrite prompts, since the slug may hold an earlier assessment.
- Pass `slug=<slug>` to every step after intake. All five steps write only to `.specify/assessments/<slug>/`.
- Never edit `.specify/` templates or `.claude/skills/speckit-*/`; Spec Kit overwrites them on upgrade.
- `handoff=no` in the input (any position): strip it from the idea; a go verdict then stops at step 6. Default: hand off.
- Caps: Clarify loop 2 re-runs, then stop; no other loop or retry.
- Chaining `cdk:run-spec-kit`: Skill tool, main thread, never `context: fork`, only after the user confirms the question to hand off (step 6; unattended never starts it). Read its Output `Result:` line.
- AskUserQuestion unavailable: ask the pending question as plain text with its options, end the turn, and take the next message as the answer.
- Unattended (chained, no AskUserQuestion): ask nothing; stop at the first question needing the user and list it in `Open:`.
- Never set `disable-model-invocation: true` on this skill; it is chained through the Skill tool.

## Workflow

1. **Pre-flight.** Core and assess skill dirs must exist (`references/required-skills.md`); empty input → AskUserQuestion for the idea. Detail: `references/flow.md` `## Pre-flight`.
2. **Extract.** Pull the idea, requester, URLs, tickets, paths; show it in 1-2 lines. None given or cancel → `Result: cancelled`.
3. **Intake.** Run `speckit-assess-intake <idea>`; take the slug from its `Slug:` line.
4. **Research, define, shape.** Run `speckit-assess-research`, `-define`, `-shape`, each with `slug=<slug>`.
5. **Decide.** Run `speckit-assess-decide slug=<slug>`, then read the verdict: `go` → 6, `needs-clarification` → 7, `kill` → show the reason, end. Else `flow.md` `## Verdict`.
6. **Hand off.** Unless `handoff=no`, print the Output, ask ("Start run-spec-kit", "Stop here"), then on start invoke `cdk:run-spec-kit` with the `## If go` section verbatim (`flow.md` `## Hand off`).
7. **Clarify.** Max 2 re-runs: ask the blocking questions, re-run the revisit stage through decide, re-read the verdict (`flow.md` `## Clarify`).
8. **Report.** List anything left in `Open:` and print the Output.

## Files

- For required skill dirs and the missing-setup message, see `${CLAUDE_SKILL_DIR}/references/required-skills.md`.
- For pre-flight, verdict reading, hand off, and the clarify loop, see `${CLAUDE_SKILL_DIR}/references/flow.md`.

## Output

```text
Assessment: .specify/assessments/<slug>/
Verdict: go | needs-clarification | kill | unknown (<re-runs> re-run(s))
Next: run-spec-kit started | handoff ready | blocking questions open | closed (<decisive reason>) | none
Open: <question or risk: who acts; recommended answer path, …> | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
