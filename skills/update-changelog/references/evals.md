# Evals

Cases for `update-changelog`: direct writes, release mode, and fallbacks. Test each on Haiku, Sonnet, and Opus.

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

| id                  | prompt                                                                                | expected                                                                                  | pass                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| new-entries         | "Update the changelog." (two user-facing commits)                                     | Fetches, prints the entries, then writes                                                  | `fetch` runs first; the entries are printed and written with no wait; only Unreleased and link refs change                         |
| nothing-changed     | "Update the changelog." (no new changes)                                              | No write                                                                                  | `Result: nothing-to-do`; `CHANGELOG: unchanged`                                                                                    |
| release-no-date     | "Update the changelog release 1.3.0"                                                  | Asks the date                                                                             | Offers Today (the session date, else `date +%F`), Enter another, Stop                                                              |
| released-section    | "Update the changelog." (a released entry looks wrong)                                | Leaves it                                                                                 | Released section content unchanged; item under `Open:`                                                                             |
| unattended          | "Update the changelog" (no way to ask, release without version)                       | Stops                                                                                     | `Stopped: 5: version or date missing`; no write                                                                                    |
| no-approval-step    | "Update the changelog." (two user-facing commits)                                     | Runs end to end with no approval step and no confirmation; side-effect steps run directly | No approval wait; each side-effect step runs directly after the decision questions                                                 |
| auto-invoke         | A natural request for the action, no `/cdk:` command                                  | Claude loads the skill on its own                                                         | The skill runs; each side-effect step runs directly after the decision questions                                                   |
| grill-close-call    | A decision question whose top two totals are ≤5 apart                                 | Table before the question; no Recommended                                                 | Table before the question; integer weights sum to 100; no Recommended; "close call" stated; unverified scores marked               |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
