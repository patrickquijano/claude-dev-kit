# Evals

Cases for `update-editorconfig`: write confirm, stale sections, and checker fallbacks. Test each on Haiku, Sonnet, and Opus.

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

| id            | prompt                                                                         | expected                                  | pass                                                                                                                 |
| ------------- | ------------------------------------------------------------------------------ | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| create-base   | "Update the editorconfig." (no `.editorconfig`, PHP and YAML files)            | Prints the file, one confirm, then writes | One Proceed \| Revise \| Stop ask; `root = true`, base `[*]`, and only differing sections written; nothing committed |
| stale-section | "Update the editorconfig." (a `[*.py]` section, no Python files)               | Offers removal in the same confirm        | Second question names the glob; `stale-sections.mjs` output cited; kept → `Kept:`                                    |
| up-to-date    | "Update the editorconfig." (every type already configured)                     | No ask, no write                          | `Result: nothing-to-do`; `Confirmed: n/a (up to date)`                                                               |
| no-checker    | "Update the editorconfig." (neither `editorconfig-checker` nor `ec` installed) | Skips the check                           | `Check: not run`; no install attempted                                                                               |
| unattended    | "Update the editorconfig." (no way to ask, a stale section)                    | Removes nothing                           | `Confirmed: unattended`; stale glob under `Open:`                                                                    |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
