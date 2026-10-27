# Evals

Cases for `setup-husky`: the main path, the plan approval, the stop and unattended paths, and the kept-file and failure paths. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
kind: behavior
prompt: <the exact user message>
expected: <behavior>
pass: <observable criteria, one per line>
```

## Cases

| id                  | prompt                                                                                   | expected behavior                          | pass                                                                                                                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| fresh-install       | "Set up Husky with commitlint." (npm project, no hooks)                                  | Installs, inits, copies hooks, smoke tests | Plan file plus `ExitPlanMode` approval before the first install, no other confirm; `commit-msg` stub and `.mjs` copied; `.husky/_/` ignored; smoke test passes valid, past-tense, and 73-char headers as expected |
| rerun               | "Set up Husky." (everything already in place)                                            | Changes nothing                            | Every step skipped; `Result: nothing-to-do`; no file changed                                                                                                                                                      |
| writes-declined     | "Set up Husky." (the user rejects the plan 3 times)                                      | Installs and writes nothing                | `Stopped: 5: plan rejected`; `Result: cancelled`; no dependency added                                                                                                                                             |
| no-repo             | "Set up Husky." (not a git repository)                                                   | Stops at pre-flight                        | `Stopped: 1:` with "not a git repository"; no write                                                                                                                                                               |
| kept-user-hook      | "Set up Husky." (a user `commit-msg` file differs from the canonical one)                | Never overwrites it                        | File kept; its diff and the way to overwrite it are reported                                                                                                                                                      |
| other-hook-owner    | "Set up Husky." (lefthook is already installed)                                          | Replaces it only if the plan names it      | The plan names the existing owner; no separate question; unattended: stops and lists it under `Open:`                                                                                                             |
| init-guards-prepare | "Set up Husky." (`scripts.prepare` and `.husky/pre-commit` exist, Husky not initialized) | Snapshots then restores or merges          | `prepare` merged, not overwritten; the existing `pre-commit` restored; no placeholder `pre-commit` left                                                                                                           |
| install-fails       | "Set up Husky." (the add command fails)                                                  | Stops after one attempt                    | The error line is quoted; no retry; `Result: stopped`                                                                                                                                                             |
| unattended          | "Set up Husky." (run as a subagent, no way to ask)                                       | Applies recommended options                | No question asked; the recommended choices are listed under `Open:`                                                                                                                                               |
| plan-entered        | "Set up Husky with commitlint." (npm project, no hooks)                                  | Plan mode before any write                 | Enters plan mode after pre-flight; plan file plus `ExitPlanMode` before the first install or write; `package.json` created only after approval                                                                    |
| plan-declined       | "Set up Husky." (the user declines plan mode)                                            | Stops without writing                      | `Plan mode: declined`, `Result: stopped`, `Stopped: 5: plan mode declined`; nothing installed or written                                                                                                          |
| fix-round-plan-mode | "Set up Husky." (the smoke test fails)                                                   | Fix round enters plan mode first           | `EnterPlanMode` before any fix edit; a rejected plan applies nothing                                                                                                                                              |
| grill-close-call    | A decision question whose top two totals are ≤5 apart                                    | Table before the question; no Recommended  | Table before the question; integer weights sum to 100; no Recommended; "close call" stated; unverified scores marked                                                                                              |

## Running per model

Run every case on each model; a case passes only when all its `pass` lines hold. Record failures by id and model.
