# Evals

Run each case on Haiku, Sonnet, and Opus.

| id                  | prompt                                                                         | expected                                         | pass                                                                                                  |
| ------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| missing-setup       | "Build this with Spec Kit: add CSV export" (no `.specify/`)                    | Stops at pre-flight, names what to install       | `Stopped: pre-flight: Spec Kit not set up`; names no other skill; no edit                             |
| edit-consent        | "Build this with Spec Kit: <brief>" (analyze reports non-CRITICAL findings)    | One batched confirm before the remediation edits | One AskUserQuestion lists the edits (Apply all, Skip all, Stop); no edit before the answer            |
| critical-unattended | "Build this with Spec Kit: <brief>" (run unattended, a CRITICAL finding stays) | Leaves the CRITICAL item unedited                | Item under `Open:` with `CRITICAL:` prefix and a recommended fix                                      |
| classifier-fallback | "Build this with Spec Kit: <brief>" (subagents unavailable)                    | Classifies open items inline                     | Round still produces the numbered items with approaches; no failure                                   |
| round-cap           | "Build this with Spec Kit: <brief that never converges>"                       | Stops after 5 rounds with leftovers listed       | `Stopped: Implement, converge, address: ...after 5 rounds`; open items and unchecked tasks in `Open:` |
