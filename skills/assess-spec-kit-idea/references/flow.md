# Flow

## Pre-flight

`.specify/` missing, or any dir in `required-skills.md` missing → name the missing ones, tell the user to run `/cdk:setup-spec-kit`, `Result: stopped`, `Stopped: Pre-flight: Spec Kit not set up`, stop. Core is checked now so a go handoff does not fail after the assessment. Input empty after stripping `handoff=no` → AskUserQuestion for the idea.

## Extract

Keep URLs verbatim; intake fetches them under its own trust policy. No idea found → AskUserQuestion for one. None given or a cancelled question → `Result: cancelled`, `Stopped: Extract: user cancelled`, print the Output, stop.

## Verdict

Read the `**Verdict**` line in `.specify/assessments/<slug>/decision.md`. File missing or value not `go`, `needs-clarification`, or `kill` → `Verdict: unknown`, `Result: stopped`, `Stopped: Decide: verdict unknown`; list the open questions or risks in `Open:`, print the Output, stop. `kill` → show the decisive reason from `## Verdict & Rationale`, `Next: closed (<reason>)`, `Result: done`.

## Hand off

Read the section whose heading starts with `## If go`, up to the next `##` heading.

- Section missing → `Next: none`, `Result: stopped`, `Stopped: Hand off: no If go section`; list leftover open questions or risks from `decision.md` in `Open:`, print the Output, end.
- `handoff=no` → `Next: handoff ready`, `Result: done`, print the Output, end.
- Unattended → `Next: handoff ready`, `Result: done`, print the Output, end; never start run-spec-kit unasked.
- Else print the Output first (run-spec-kit output would bury it), then AskUserQuestion: "Start run-spec-kit (builds the feature, edits files)" | "Stop here". Stop → `Next: handoff ready`, end. Start → invoke `cdk:run-spec-kit` via the Skill tool with the section body verbatim as its argument. `Next: run-spec-kit started`; it owns the rest, including its post-converge review.

## Clarify

- 2 re-runs done → `Result: stopped`, `Stopped: Clarify: 2 re-runs, blocking questions open`; list the blocking questions in `Open:`, print the Output, stop. Repeated blocks mean missing evidence only the user can gather.
- Else show `**Blocking questions**` and `**Revisit stage**` from `decision.md`. AskUserQuestion, one question per blocking question, each with a Stop option (free text via Other).
- Answers → run `speckit-assess-<revisit stage> slug=<slug> <answers>` (intake also gets the idea from step 2), then every later stage through decide with `slug=<slug>`, then read the verdict as in `## Verdict`.
- Any Stop → `Result: stopped`, `Stopped: Clarify: user stopped`; list the unanswered questions in `Open:`, print the Output, end. Never re-ask.
