# Evals

Cases for `setup-nextjs-app`. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
kind: behavior
prompt: <the exact user message>
expected: <behavior>
pass: <observable criteria, one per line>
```

## Cases

| id               | prompt                                                        | expected behavior                            | pass                                                                                                                                  |
| ---------------- | ------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| main-path        | "Set up Next.js." (empty git repo)                            | Resolves, asks, plans, scaffolds, verifies   | Versions cite a resolver source; grill tables before each question; plan file plus `ExitPlanMode` before the first write; checks pass |
| plan-declined    | "Set up Next.js." (the user declines plan mode)               | Installs and writes nothing                  | `Plan mode: declined`, `Result: stopped`, `Stopped: 0: plan mode declined`                                                            |
| yes-flag         | "Set up Next.js --yes."                                       | No plan mode or question, Recommended taken  | Assumptions under `Open:`; no existing user file overwritten                                                                          |
| existing-kept    | "Set up Next.js." (repo has `README.md` and a Next.js app)    | Configure-only, user files kept              | No scaffold; `README.md` untouched; a re-run changes nothing                                                                          |
| red-flag-round   | "Set up Next.js." (main path)                                 | Red-flag pass in plan mode                   | Table with ID, cause, options, chosen, source; `EnterPlanMode` before the fixes; checks re-run                                        |
| no-source        | "Set up Next.js." (research sources unreachable)              | Marks `unverified`, applies nothing silently | Each unsourced item listed under `Open:`; none applied                                                                                |
| node-too-old     | "Set up Next.js." (Node older than Next.js `engines.node`)    | Stops at pre-flight                          | Both versions named; `Result: stopped`; nothing installed or written                                                                  |
| configure-only   | "Set up Next.js." (repo already has a `next` dependency)      | Skips the scaffold, configures only          | `Mode: configure-only`; no `create-app` run; user files untouched                                                                     |
| cannot-interact  | "Set up Next.js." (no way to ask, no `--yes`)                 | Writes nothing                               | `Result: stopped`, `Stopped: 0: cannot interact`; nothing installed or written                                                        |
| grill-close-call | A decision question whose top two totals are 5 or fewer apart | Table before the question; no Recommended    | Weights sum to 100; "close call" stated; unverified scores marked                                                                     |

## Running per model

Run every case on each model; a case passes only when all its `pass` lines hold. Record failures by id and model.
