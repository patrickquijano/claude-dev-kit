---
name: assess-spec-kit-idea
description: Vets an idea with Spec Kit's assess extension, returning go, needs-clarification, or kill; on go, prints a feature brief. Use only when the user explicitly asks to vet an idea with Spec Kit.
compatibility: Claude Code only. Uses argument-hint, disable-model-invocation, and CLAUDE_SKILL_DIR; claude.ai and API uploads reject unknown frontmatter keys.
disable-model-invocation: true
argument-hint: '<idea text | URL | ticket | codebase pointer>'
---

# Assess Spec Kit Idea

Input: $ARGUMENTS

## Rules

- Ask (unattended: record) what the input and repo cannot answer.
- No step spawns a subagent.
- Run each speckit step (a third-party skill installed by `specify init`) with the Skill tool in this main thread, one at a time, never via the Agent tool (a subagent has no AskUserQuestion). Wait for each to finish; speckit skills do not chain themselves.
- Relay every question a speckit skill asks with AskUserQuestion. Pre-approved exceptions: accept the slug intake suggests (step 3); in step 7 re-runs only, answer yes to overwriting artifacts in the current slug. On the first pass relay overwrite prompts, since the slug may hold an earlier assessment.
- Pass `slug=<slug>` to every step after intake. All five steps write only to `.specify/assessments/<slug>/`.
- Never edit `.specify/` templates or the third-party `.claude/skills/speckit-*/`; Spec Kit overwrites them on upgrade.
- Caps: Clarify loop 2 re-runs, then stop; no other loop or retry.
- Never start the build; on go, print the `## If go` brief as a ready-to-use feature brief (step 6).
- AskUserQuestion unavailable but a user can reply: ask the pending question as plain text with its options, end the turn, and take the next message as the answer.
- Unattended (no one can answer, such as a non-interactive run): ask nothing; stop at the first question needing the user and list it in `Open:`.

## Workflow

1. **Pre-flight.** Core and assess skill dirs must exist (`${CLAUDE_SKILL_DIR}/references/required-skills.md`); empty input → AskUserQuestion for the idea. Detail: `${CLAUDE_SKILL_DIR}/references/flow.md` `## Pre-flight`.
2. **Extract.** Pull the idea, requester, URLs, tickets, paths; show it in 1-2 lines. None given or cancel → `Result: cancelled`.
3. **Intake.** Run the third-party `speckit-assess-intake <idea>`; take the slug from its `Slug:` line.
4. **Research, define, shape.** Run the third-party `speckit-assess-research`, `-define`, `-shape`, each with `slug=<slug>`.
5. **Decide.** Run the third-party `speckit-assess-decide slug=<slug>`, then read the verdict: `go` → 6, `needs-clarification` → 7, `kill` → show the reason, end. Else `flow.md` `## Verdict`.
6. **Hand off.** Print the Output with the `## If go` section verbatim as the feature brief and `Next: build the feature from the brief above` (`flow.md` `## Hand off`).
7. **Clarify.** Max 2 re-runs: ask the blocking questions, re-run the revisit stage through decide, re-read the verdict (`flow.md` `## Clarify`).
8. **Report.** List anything left in `Open:` and print the Output.

## Files

- For required skill dirs and the missing-setup message, see `${CLAUDE_SKILL_DIR}/references/required-skills.md`.
- For pre-flight, verdict reading, hand off, and the clarify loop, see `${CLAUDE_SKILL_DIR}/references/flow.md`.
- For test scenarios, see `${CLAUDE_SKILL_DIR}/references/evals.md`.

## Output

```text
Assessment: .specify/assessments/<slug>/
Verdict: go | needs-clarification | kill | unknown (<re-runs> re-run(s))
Brief: <## If go section verbatim> | none
Next: build the feature from the brief above | answer the blocking questions | closed (<decisive reason>) | none
Open: <question or risk: who acts; recommended answer path, …> | none
Result: done | stopped | cancelled
Stopped: <step>: <reason> | none
```
