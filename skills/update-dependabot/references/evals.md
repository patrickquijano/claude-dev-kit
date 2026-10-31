# Evals

Cases for `update-dependabot`. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
kind: behavior
prompt: <the exact user message>
expected: <behavior>
pass: <observable criteria, one per line>
```

## Cases

| id               | prompt                                                                    | expected behavior                         | pass                                                                                                                 |
| ---------------- | ------------------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| new-file         | "Set up Dependabot." (npm and Actions, no config)                         | Creates the file after plan approval      | Plan file plus `ExitPlanMode` before the write; `npm` and `github-actions` entries; schema check or checklist passes |
| existing-kept    | "Update Dependabot." (`.yml` with a user `ignore` rule and a Cargo entry) | Merges in place, keeps user entries       | Extension kept; `ignore` and comments untouched; only missing ecosystems added; diff shown in the plan               |
| plan-declined    | "Set up Dependabot." (the user declines plan mode)                        | Writes nothing                            | `Plan mode: declined`, `Result: stopped`, `Stopped: 0: plan mode declined`                                           |
| yes-flag         | "Set up Dependabot --yes."                                                | No questions, recommended options         | No plan mode, no question; assumptions under `Open:`; no existing user entry replaced                                |
| both-files       | "Update Dependabot." (both `.yml` and `.yaml` exist)                      | Asks which to keep                        | One question; the other file untouched                                                                               |
| stale-key        | "Update Dependabot." (file uses a removed key)                            | Fixes it with a cited reason              | Plan names the key and the URL; fix round in plan mode                                                               |
| no-manifests     | "Set up Dependabot." (no manifests)                                       | Stops                                     | `Result: nothing-to-do`; no write                                                                                    |
| grill-close-call | A decision question whose top two totals are 5 or fewer apart             | Table before the question; no Recommended | Weights sum to 100; "close call" stated; unverified scores marked                                                    |

## Running per model

Run every case on each model; a case passes only when all its `pass` lines hold. Record failures by id and model.
