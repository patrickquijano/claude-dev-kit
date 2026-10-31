# Evals

Cases for `setup-formatters`: create, update with a diff, re-run, plan mode, unattended, and fallbacks. Test each on Haiku, Sonnet, and Opus.

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

| id                  | prompt                                                                                       | expected                                                      | pass                                                                                                                                             |
| ------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| create-js-repo      | "Set up formatters." (JS and JSON files, `package.json`, no formatter config)                | Creates Prettier and its config after plan approval           | Plan lists Prettier at a resolved version and `.prettierrc.json`; written only after `ExitPlanMode`; `Formatters:` names Prettier                |
| create-no-manifest  | "Set up formatters." (JS files, no `package.json`)                                           | Plan lists the `package.json`, creates it only after approval | `package.json` absent until approval; the plan lists it                                                                                          |
| update-with-diff    | "Set up formatters." (a `.prettierrc.json` with `printWidth: 80`)                            | Shows a diff and asks Overwrite or Keep                       | The diff against the catalog keys is shown; one question, Keep first; `Configs:` says `kept` or `overwritten` per the answer                     |
| rerun-no-duplicates | "Set up formatters." (run twice on the same repo)                                            | Second run adds nothing                                       | `Installed: already present`; `Ignores: up to date`; the second run writes no duplicate entry; `Result: nothing-to-do`                           |
| plan-declined       | "Set up formatters." (the user declines plan mode)                                           | Stops without writing                                         | `Plan mode: declined`, `Result: stopped`, `Stopped: 0: plan mode declined`; nothing installed or written                                         |
| unattended          | "Set up formatters." (no way to ask)                                                         | Installs and writes nothing                                   | No question; `Result: stopped`, `Stopped: 0: unattended`; planned work under `Open:`                                                             |
| unknown-type        | "Set up formatters." (`.sass` files only)                                                    | Asks for a tool name                                          | One question asking for a formatter name; no tool guessed; `File types:` lists `unknown: sass` until answered                                    |
| analyst-unavailable | "Set up formatters." (the detect spawn fails)                                                | Detects inline, no stop                                       | File types, roles, and package filled from `list-files` and `pm-detect`; no `Stopped: 2`                                                         |
| resolver-malformed  | "Set up formatters." (the version spawn returns garbage twice)                               | Resolves inline                                               | Versions come from `npm-view` output; an unverifiable package under `Skipped tools:`; no remembered version                                      |
| two-lockfiles       | "Set up formatters." (`yarn.lock` and `package-lock.json` in one dir)                        | Asks which manager                                            | `pm-detect` returns `unknown`; one question, npm (Recommended) first                                                                             |
| fix-round-plan-mode | "Set up formatters." (a config this run wrote is invalid)                                    | Fix round enters plan mode first                              | `EnterPlanMode` before any fix edit; a rejected plan applies nothing                                                                             |
| yaml-quote-style    | "Set up formatters." (yamlfmt, `.yamllint.yaml` with `quoted-strings: {quote-type: single}`) | Maps the quote type to `force_quote_style`                    | `.yamlfmt.yaml` has `force_quote_style: single`; `quote-type: any` or no `quoted-strings` writes no key; no quoting key is invented for Prettier |
| grill-close-call    | A decision question whose top two totals are ≤5 apart                                        | Table before the question; no Recommended                     | Table before the question; integer weights sum to 100; no Recommended; "close call" stated; unverified scores marked                             |
| no-plan-stop        | "Set up formatters --no-plan." (JS files, `package.json`, no config)                         | Asks Go or Stop before any write, no plan mode                | `Plan mode: skipped`; one ask `Go` or `Stop` naming the effects; `Stop` gives `Result: cancelled`, `Stopped: 0: gate stopped`; nothing written   |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
