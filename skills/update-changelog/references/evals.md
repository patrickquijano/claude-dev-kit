# Evals

Cases for `update-changelog`: write confirm, release mode, and fallbacks. Test each on Haiku, Sonnet, and Opus.

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

| id               | prompt                                                          | expected                                 | pass                                                                    |
| ---------------- | --------------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------- |
| new-entries      | "Update the changelog." (two user-facing commits)               | Prints entries, one confirm, then writes | One Proceed \| Revise \| Stop ask; only Unreleased and link refs change |
| nothing-changed  | "Update the changelog." (no new changes)                        | No write                                 | `Result: nothing-to-do`; `CHANGELOG: unchanged`                         |
| release-no-date  | "Update the changelog release 1.3.0"                            | Asks the date                            | Offers Today (the session date, else `date +%F`), Enter another, Stop   |
| released-section | "Update the changelog." (a released entry looks wrong)          | Leaves it                                | Released section content unchanged; item under `Open:`                  |
| unattended       | "Update the changelog" (no way to ask, release without version) | Stops                                    | `Stopped: 5: version or date missing`; no write                         |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
