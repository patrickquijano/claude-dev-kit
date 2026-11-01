# Evals

Cases for `update-editorconfig`: stale sections, and checker fallbacks. Test each on Haiku, Sonnet, and Opus.

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

| id               | prompt                                                                         | expected                                                                                  | pass                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| create-base      | "Update the editorconfig." (no `.editorconfig`, PHP and YAML files)            | Writes with no confirmation                                                               | No question asked; `root = true`, base `[*]`, and only differing sections written; nothing committed |
| stale-section    | "Update the editorconfig." (a `[*.py]` section, no Python files)               | Asks the removal before writing                                                           | The stale question is asked before the write; `stale-sections.mjs` output cited; kept → `Kept:`      |
| up-to-date       | "Update the editorconfig." (every type already configured)                     | No ask, no write                                                                          | No question; `Result: nothing-to-do`; `.editorconfig: up to date`                                    |
| no-checker       | "Update the editorconfig." (neither `editorconfig-checker` nor `ec` installed) | Skips the check                                                                           | `Check: not run`; no install attempted                                                               |
| unattended       | "Update the editorconfig." (no way to ask, a stale section)                    | Removes nothing                                                                           | No question; the stale glob is kept and listed under `Open:`                                         |
| fix-round        | "Update the editorconfig." (a section this run wrote has a glob error)         | Corrects the section and re-checks                                                        | The section is corrected with no approval step; the checker re-runs (cap 2 passes)                   |
| no-approval-step | "Update the editorconfig." (no `.editorconfig`, PHP and YAML files)            | Runs end to end with no approval step and no confirmation; side-effect steps run directly | No approval wait; each side-effect step runs directly after the decision questions                   |
| auto-invoke      | A natural request for the action, no `/cdk:` command                           | Claude loads the skill on its own                                                         | The skill runs; no approval step precedes any write                                                  |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
