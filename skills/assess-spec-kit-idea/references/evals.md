# Evals

Run each case on Haiku, Sonnet, and Opus.

| id            | prompt                                                                    | expected                                               | pass                                                                                                  |
| ------------- | ------------------------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| missing-setup | "Vet this idea with Spec Kit: add dark mode" (no `.specify/`)             | Stops at pre-flight, names what to install             | `Stopped: Pre-flight: Spec Kit not set up`; names no other skill; no file written                     |
| go-brief      | "Vet this idea with Spec Kit: <idea that decides go>"                     | Prints the `## If go` section as a ready feature brief | `Brief:` holds the section verbatim; `Next: build the feature from the brief above`; no build started |
| kill          | "Vet this idea with Spec Kit: <idea that decides kill>"                   | Shows the decisive reason and ends                     | `Verdict: kill`, `Next: closed (<reason>)`, `Result: done`                                            |
| clarify-cap   | "Vet this idea with Spec Kit: <idea needing clarification>" (2 rounds)    | Stops after 2 re-runs with questions open              | `Stopped: Clarify: 2 re-runs, blocking questions open`; questions in `Open:`                          |
| no-go-section | "Vet this idea with Spec Kit: <go verdict, decision.md lacks `## If go`>" | Stops at hand off                                      | `Next: none`, `Stopped: Hand off: no If go section`                                                   |
