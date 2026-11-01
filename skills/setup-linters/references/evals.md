# Evals

Cases for `setup-linters`: create, update with a diff, re-run, formatter-aware disables, unattended, and fallbacks. Test each on Haiku, Sonnet, and Opus.

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

| id                  | prompt                                                                      | expected                                                                                  | pass                                                                                                                                                     |
| ------------------- | --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| create-js-repo      | "Set up linters." (JS and Markdown files, `package.json`, no linter config) | Creates ESLint and markdownlint-cli2 and their configs                                    | Plan lists both at resolved versions and their configs; printed before the first write; `Tools:` names them                                              |
| update-with-diff    | "Set up linters." (an `eslint.config.mjs` that differs from the catalog)    | Shows a diff and asks Overwrite or Keep                                                   | The diff is shown; one question, Keep first; `Configs:` says `kept` or `overwritten` per the answer                                                      |
| rerun-no-duplicates | "Set up linters." (run twice on the same repo)                              | Second run adds nothing                                                                   | `Installed: already present`; `Ignores: up to date`; no duplicate config element or ignore entry; `Disabled rules:` adds nothing the second time         |
| one-formatter       | "Set up linters." (JS files and a `.prettierrc.json`)                       | Adds `eslint-config-prettier/flat` last and runs the conflict check                       | Plan lists the disable; the element is last in the config array; `npx eslint-config-prettier <file>` runs; `Disabled rules:` names it                    |
| several-formatters  | "Set up linters." (Python files with `[tool.black]` and `ruff.toml`)        | Asks which formatter applies                                                              | One question, one option per formatter; only that formatter's entry from `formatter-conflicts.md` is planned                                             |
| no-formatter        | "Set up linters." (JS files, no formatter config)                           | Disables nothing                                                                          | No formatter question; `Disabled rules: none`; no `eslint-config-prettier` installed                                                                     |
| manual-pair         | "Set up linters." (Swift files with `.swiftformat`)                         | Records a manual review, writes no disabled rules                                         | `.swiftlint.yml` has no `disabled_rules`; `Open:` names SwiftLint and SwiftFormat as "review manually"                                                   |
| unattended          | "Set up linters." (no way to ask)                                           | Installs and writes nothing                                                               | No question; `Result: stopped`, `Stopped: 1: unattended`; planned work under `Open:`                                                                     |
| yes-keeps-config    | "Set up linters --yes." (an existing config differs from the catalog)       | Keeps it                                                                                  | No question; the config is not overwritten; `Configs:` says `kept`; the file is listed under `Open:`                                                     |
| unknown-type        | "Set up linters." (`.sass` files only)                                      | Asks for a tool name                                                                      | One question asking for a linter name; no tool guessed                                                                                                   |
| analyst-unavailable | "Set up linters." (the detect spawn fails)                                  | Detects inline, no stop                                                                   | File types and roles filled from `list-files`; no `Stopped: 2`                                                                                           |
| yaml-quoting        | "Set up linters." (YAML files, no `.yamllint*`)                             | Writes `quoted-strings` only-when-needed                                                  | `.yamllint.yaml` has `quoted-strings: {required: only-when-needed}`; plain strings in quotes found in the repo are listed under `Open:`, none auto-fixed |
| no-approval-step    | "Set up linters." (JS and Markdown files, `package.json`, no linter config) | Runs end to end with no approval step and no confirmation; side-effect steps run directly | No approval wait; each side-effect step runs directly after the decision questions                                                                       |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
