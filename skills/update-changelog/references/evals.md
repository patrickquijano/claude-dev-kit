# Evals

Cases for `update-changelog`: plan mode, release mode, and fallbacks. Test each on Haiku, Sonnet, and Opus.

## Contents

- Template · Cases · Running per model

## Template

```text
id: <kebab-case>
prompt: <the exact user message and repo state>
expected: <behavior>
pass: <observable criteria>
```

## Cases

| id                  | prompt                                                                                | expected                                      | pass                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| new-entries         | "Update the changelog." (two user-facing commits)                                     | Fetches, enters plan mode, plans, then writes | `fetch` runs before plan mode; plan file plus `ExitPlanMode` approval comes before the write; only Unreleased and link refs change |
| nothing-changed     | "Update the changelog." (no new changes)                                              | No write                                      | `Result: nothing-to-do`; `CHANGELOG: unchanged`; no plan file                                                                      |
| release-no-date     | "Update the changelog release 1.3.0"                                                  | Asks the date                                 | Offers Today (the session date, else `date +%F`), Enter another, Stop                                                              |
| released-section    | "Update the changelog." (a released entry looks wrong)                                | Leaves it                                     | Released section content unchanged; item under `Open:`                                                                             |
| unattended          | "Update the changelog" (no way to ask, release without version)                       | Stops                                         | `Plan mode: skipped (unattended)`; `Stopped: 5: version or date missing`; no write                                                 |
| plan-declined       | "Update the changelog." (user declines plan mode)                                     | Stops                                         | `Plan mode: declined`; `Stopped: 5: plan mode declined`; no write                                                                  |
| plan-rejected       | "Update the changelog." (user rejects the plan 3 times)                               | Cancels                                       | `Result: cancelled`; `Stopped: 5: plan rejected`; no write                                                                         |
| fix-round-plan-mode | "Update the changelog." (review checklist has a safe fix; the round plan is rejected) | Enters plan mode before the fix               | Round k calls `EnterPlanMode` before any edit; a rejected plan applies nothing; items under `Open:`                                |
| auto-invoke         | A natural request for the action, no `/cdk:` command                                  | Claude loads the skill on its own             | The skill runs; its existing confirm or plan approval still precedes any write or push                                             |
| grill-close-call    | A decision question whose top two totals are ≤5 apart                                 | Table before the question; no Recommended     | Table before the question; integer weights sum to 100; no Recommended; "close call" stated; unverified scores marked               |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
