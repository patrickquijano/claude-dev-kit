# Evals

Run each case on Haiku, Sonnet, and Opus.

| id | prompt | expected | pass |
| --- | --- | --- | --- |
| missing-setup | "Build this with Spec Kit: add CSV export" (no `.specify/`) | Stops at pre-flight, names what to install | `Stopped: 1: Spec Kit not set up`; names no other skill; no edit |
| user-stop | "Build this with Spec Kit." (no what and why; the user cancels the question) | Stops at extract, edits nothing | `Result: stopped`, `Stopped: 2: user stopped`; no `speckit-*` skill run |
| critical-unattended | "Build this with Spec Kit: <brief>" (run unattended, a CRITICAL finding stays) | Leaves the CRITICAL item unedited | Item under `Open:` with `CRITICAL:` prefix and a recommended fix |
| classifier-fallback | "Build this with Spec Kit: <brief>" (subagents unavailable) | Classifies open items inline | Round still produces the numbered items with approaches; no failure |
| round-cap | "Build this with Spec Kit: <brief that never converges>" | Stops after 5 rounds with leftovers listed | `Stopped: 10: ...after 5 rounds`; open items and unchecked tasks in `Open:` |
| no-approval-step | "Build this with Spec Kit: <brief>" | Runs end to end with no approval step and no confirmation; side-effect steps run directly | No approval wait; each side-effect step runs directly after the decision questions |
| yes-no-what-and-why | "/cdk:run-spec-kit --yes <input with only principles or tech detail, no what and why>" (Spec Kit set up) | Asks nothing and stops at step 2 | No question asked; `Result: stopped`; `Stopped: 2: what and why missing`; no `speckit-specify` run |
| cannot-interact | "Build this with Spec Kit." (Spec Kit set up, no what and why in the input; run headless, no one to reply, no `--yes`) | Stops at the first question; changes nothing | `Result: stopped`; `Stopped: 2: cannot interact`; no `speckit-*` skill run; no file edited |
| grill-close-call | A decision question whose top two totals are ≤5 apart | Table before the question; no Recommended | Table before the question; integer weights sum to 100; no Recommended; "close call" stated; unverified scores marked |
