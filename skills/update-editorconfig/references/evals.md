# Evals

Cases for `update-editorconfig`: Confirm gate, stale sections, and checker fallbacks. Test each on Haiku, Sonnet, and Opus.

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

| id                  | prompt                                                                         | expected                            | pass                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------ | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| create-base         | "Update the editorconfig." (no `.editorconfig`, PHP and YAML files)            | Confirms, then writes on Yes        | Confirm Yes is the only confirmation; `root = true`, base `[*]`, and only differing sections written; nothing committed |
| stale-section       | "Update the editorconfig." (a `[*.py]` section, no Python files)               | Asks the removal before the Confirm | The stale question is asked before the Confirm; `stale-sections.mjs` output cited; kept → `Kept:`                       |
| up-to-date          | "Update the editorconfig." (every type already configured)                     | No ask, no write                    | No Confirm; `Result: nothing-to-do`; `Confirmed: n/a (up to date)`                                                      |
| no-checker          | "Update the editorconfig." (neither `editorconfig-checker` nor `ec` installed) | Skips the check                     | `Check: not run`; no install attempted                                                                                  |
| unattended          | "Update the editorconfig." (no way to ask, a stale section)                    | Removes nothing                     | No Confirm; `Confirmed: unattended`; stale glob under `Open:`                                                           |
| confirm-declined    | "Update the editorconfig." (the user answers No at the Confirm)                | Cancels, writes nothing             | `Result: cancelled`; no file written                                                                                    |
| fix-round-plan-mode | "Update the editorconfig." (a section this run wrote has a glob error)         | Fix round enters plan mode first    | `EnterPlanMode` before any fix edit; a rejected plan applies nothing                                                    |
| auto-invoke         | A natural request for the action, no `/cdk:` command                           | Claude loads the skill on its own   | The skill runs; its existing confirm or plan approval still precedes any write or push                                  |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
