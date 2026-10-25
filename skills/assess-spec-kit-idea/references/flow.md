# Flow

## Pre-flight

`.specify/` missing, or any dir in `required-skills.md` missing → name the missing ones, tell the user to install Spec Kit (`specify init`) and its Claude integration, `Result: stopped`, `Stopped: Pre-flight: Spec Kit not set up`, stop. Input empty → AskUserQuestion for the idea.

## Extract

Keep URLs verbatim; intake fetches them under its own trust policy. No idea found → AskUserQuestion for one. None given or a cancelled question → `Result: cancelled`, `Stopped: Extract: user cancelled`, print the Output, stop. Then ask `Run assessment` | `Stop` once; `Stop` or a dismissed question → `Result: cancelled`, `Stopped: 2: run declined`, print the Output, stop; nothing is written.

## Verdict

Read the `**Verdict**` line in `.specify/assessments/<slug>/decision.md`. File missing or value not `go`, `needs-clarification`, or `kill` → `Verdict: unknown`, `Result: stopped`, `Stopped: Decide: verdict unknown`; list the open questions or risks in `Open:`, print the Output, stop. `kill` → show the decisive reason from `## Verdict & Rationale`, `Next: closed (<reason>)`, `Result: done`.

## Hand off

Read the section whose heading starts with `## If go`, up to the next `##` heading.

- Section missing → `Next: none`, `Result: stopped`, `Stopped: Hand off: no If go section`; list leftover open questions or risks from `decision.md` in `Open:`, print the Output, end.
- Else `Brief:` is the section body verbatim, `Next: build the feature from the brief above`, `Result: done`, print the Output, end. Nothing is asked and the build is never started here (it edits files).

## Clarify

- 2 re-runs done → `Result: stopped`, `Stopped: Clarify: 2 re-runs, blocking questions open`; list the blocking questions in `Open:`, print the Output, stop.
- Else show `**Blocking questions**` and `**Revisit stage**` from `decision.md`. AskUserQuestion, one question per blocking question, each with a Stop option (free text via Other).
- Answers → run the third-party `speckit-assess-<revisit stage> slug=<slug> <answers>` (intake also gets the idea from step 2), then every later stage through decide with `slug=<slug>`, then read the verdict as in `## Verdict`.
- Any Stop → `Result: stopped`, `Stopped: Clarify: user stopped`; list the unanswered questions in `Open:`, print the Output, end. Never re-ask.
