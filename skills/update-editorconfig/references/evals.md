# Evals

Cases for `update-editorconfig`: plan mode, stale sections, and checker fallbacks. Test each on Haiku, Sonnet, and Opus.

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

| id            | prompt                                                                         | expected                                  | pass                                                                                                                                                                                       |
| ------------- | ------------------------------------------------------------------------------ | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| create-base   | "Update the editorconfig." (no `.editorconfig`, PHP and YAML files)            | Enters plan mode, then writes on approval | Plan mode entered after pre-flight; the plan file plus `ExitPlanMode` approval is the only confirmation; `root = true`, base `[*]`, and only differing sections written; nothing committed |
| stale-section | "Update the editorconfig." (a `[*.py]` section, no Python files)               | Asks the removal inside plan mode         | The stale question is asked inside plan mode and the plan lists the glob; `stale-sections.mjs` output cited; kept → `Kept:`                                                                |
| up-to-date    | "Update the editorconfig." (every type already configured)                     | No ask, no write                          | No plan file and no `ExitPlanMode`; `Result: nothing-to-do`; `Confirmed: n/a (up to date)`                                                                                                 |
| no-checker    | "Update the editorconfig." (neither `editorconfig-checker` nor `ec` installed) | Skips the check                           | `Check: not run`; no install attempted                                                                                                                                                     |
| unattended    | "Update the editorconfig." (no way to ask, a stale section)                    | Removes nothing                           | `Plan mode: skipped (unattended)`; `Confirmed: unattended`; stale glob under `Open:`                                                                                                       |
| plan-declined | "Update the editorconfig." (the user declines plan mode)                       | Stops, writes nothing                     | `Stopped: 6: plan mode declined`; `Result: stopped`; no file written                                                                                                                       |
| plan-rejected | "Update the editorconfig." (the user rejects the plan 3 times)                 | Revises twice, then cancels               | `Result: cancelled`; `Stopped: 6: plan rejected`; no file written                                                                                                                          |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
