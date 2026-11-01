# Evals

Cases for `setup-dotnet-api`. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
kind: behavior
prompt: <the exact user message>
expected: <behavior>
pass: <observable criteria, one per line>
```

## Cases

| id               | prompt                                                                          | expected behavior                                                                         | pass                                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| main-path        | "Set up .NET." (empty git repo)                                                 | Resolves, asks, plans, scaffolds, verifies                                                | Versions cite a resolver source; grill tables before each question; plan printed before the first write; checks pass |
| curl-network     | "Set up .NET." (the releases index fetch fails)                                 | Stops at version resolution                                                               | `Result: stopped`; `Stopped: 2: curl or network`; nothing installed or written                                       |
| yes-flag         | "Set up .NET --yes."                                                            | No question, Recommended taken                                                            | Assumptions under `Open:`; no existing user file overwritten                                                         |
| existing-kept    | "Set up .NET." (repo has `README.md` and a .NET app)                            | Configure-only, user files kept                                                           | No scaffold; `README.md` untouched; a re-run changes nothing                                                         |
| user-file-kept   | "Set up .NET --yes." (a user-edited tracked file collides with a generated one) | Keeps it; lists it                                                                        | The file is not overwritten or deleted; it is listed under `Open:` with the change it would take; no question asked  |
| red-flag-round   | "Set up .NET." (main path)                                                      | Red-flag pass, fixes applied directly                                                     | Table with ID, cause, options, chosen, source; fixes applied with no approval wait; checks re-run                    |
| no-source        | "Set up .NET." (research sources unreachable)                                   | Marks `unverified`, applies nothing silently                                              | Each unsourced item listed under `Open:`; none applied                                                               |
| grill-close-call | A decision question whose top two totals are 5 or fewer apart                   | Table before the question; no Recommended                                                 | Weights sum to 100; "close call" stated; unverified scores marked                                                    |
| cannot-interact  | "Set up .NET." (no way to ask, no `--yes`)                                      | Writes nothing                                                                            | Nothing written; `Result: stopped`, `Stopped: 0: cannot interact`                                                    |
| no-approval-step | "Set up .NET."                                                                  | Runs end to end with no approval step and no confirmation; side-effect steps run directly | No approval wait; each side-effect step runs directly after the decision questions                                   |

## Running per model

Run every case on each model; a case passes only when all its `pass` lines hold. Record failures by id and model.
