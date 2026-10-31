# Evals

Cases for `setup-laravel-api`. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
kind: behavior
prompt: <the exact user message>
expected: <behavior>
pass: <observable criteria, one per line>
```

## Cases

| id                | prompt                                                        | expected behavior                            | pass                                                                                                                                  |
| ----------------- | ------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| main-path         | "Set up Laravel." (empty git repo)                            | Resolves, asks, plans, scaffolds, verifies   | Versions cite a resolver source; grill tables before each question; plan file plus `ExitPlanMode` before the first write; checks pass |
| plan-declined     | "Set up Laravel." (the user declines plan mode)               | Installs and writes nothing                  | `Plan mode: declined`, `Result: stopped`, `Stopped: 0: plan mode declined`                                                            |
| plan-rejected-fix | "Set up Laravel." (the user rejects a fix-round plan 3 times) | Cancels the fix round                        | `Result: cancelled`, `Stopped: 13: plan rejected` (14 for a red-flag round); no fix applied                                           |
| yes-flag          | "Set up Laravel --yes."                                       | No plan mode or question, Recommended taken  | Assumptions under `Open:`; no existing user file overwritten                                                                          |
| existing-kept     | "Set up Laravel." (repo has `README.md` and a Laravel app)    | Configure-only, user files kept              | No scaffold; `README.md` untouched; a re-run changes nothing                                                                          |
| red-flag-round    | "Set up Laravel." (main path)                                 | Red-flag pass in plan mode                   | Table with ID, cause, options, chosen, source; `EnterPlanMode` before the fixes; checks re-run                                        |
| no-source         | "Set up Laravel." (research sources unreachable)              | Marks `unverified`, applies nothing silently | Each unsourced item listed under `Open:`; none applied                                                                                |
| grill-close-call  | A decision question whose top two totals are 5 or fewer apart | Table before the question; no Recommended    | Weights sum to 100; "close call" stated; unverified scores marked                                                                     |

## Running per model

Run every case on each model; a case passes only when all its `pass` lines hold. Record failures by id and model.
