# Evals

Run each case on Haiku, Sonnet, and Opus.

| id                 | prompt                                                                      | expected                                           | pass                                                                                                                           |
| ------------------ | --------------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| not-a-repo         | "Implement this spec: add a --json flag" (outside a git repo)               | Stops at pre-flight                                | `Stopped: 1: not a git repository`; no edit                                                                                    |
| dirty-path         | "Implement this spec: <requirement touching a file with uncommitted edits>" | Treats the dirty file as off-limits                | Dirty path passed as off-limits; never reverted; edited only when the approved plan names it (`--yes`: recorded under `Open:`) |
| plan-declined      | "Implement this spec: <requirement>" (user declines plan mode)              | Stops at step 2                                    | `Plan mode: declined`; `Result: stopped`; `Stopped: 2: plan mode declined`; no edit                                            |
| yes-unattended     | "Implement this spec --yes: <requirement>"                                  | Asks nothing, skips plan mode, records assumptions | `Plan mode: skipped (--yes)`; assumptions under `Open:`; recommended approach picked                                           |
| subagent-fallback  | "Implement this spec: <requirement>" (subagents unavailable)                | Does explore, edit, and verify inline              | Goals met or unmet with evidence; no failure; no named agent anywhere in the output                                            |
| unplanned-new-file | "Implement this spec: <requirement>" (implementer adds an unplanned file)   | Asks Revert \| Keep \| Stop before any delete      | `remove-new` only after the user picks Revert; never run for a Dirty path                                                      |
| round-cap          | "Implement this spec: <requirement whose test keeps failing>"               | Stops after 3 rounds with leftovers listed         | `Rounds: 3/3`; unmet goals under `Open:` with a recommended fix; `Next: none`                                                  |
