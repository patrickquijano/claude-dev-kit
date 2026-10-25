# Evals

Cases for `setup-spec-kit`: the main path, the single confirmation, the stop and unattended paths, and the failure caps. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
kind: behavior
prompt: <the exact user message>
expected: <behavior>
pass: <observable criteria, one per line>
```

## Cases

| id                   | prompt                                                                            | expected behavior               | pass                                                                                                                                                               |
| -------------------- | --------------------------------------------------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| fresh-setup          | "Set up Spec Kit in this repo." (CLI present, no `.specify/`)                     | Init, three extensions, ignores | One "Apply" or "Stop" question before the first write; the extensions get priorities 10, 20, and 30 in that order; no `--force`; the four `.gitignore` lines added |
| rerun                | "Set up Spec Kit." (everything already done)                                      | Changes nothing                 | Every step skipped; `Result: nothing-to-do`; no file changed                                                                                                       |
| writes-declined      | "Set up Spec Kit." (the user picks Stop)                                          | Writes nothing                  | `Stopped: 2: writes declined`; no init, extension add, or ignore edit                                                                                              |
| install-declined     | "Set up Spec Kit." (CLI missing, the user declines the global install)            | Stops at step 1                 | `Open:` records the declined install; `Result: stopped` or `cancelled`; nothing installed                                                                          |
| non-empty-unattended | "Set up Spec Kit." (run as a subagent, `init-here` needed in a non-empty project) | Stops instead of initializing   | No init run; the item is under `Open:`; no question asked                                                                                                          |
| missing-skill-dirs   | "Set up Spec Kit." (an extension's skill dirs are missing)                        | One user-approved reinstall     | A question before the reinstall; at most one remove and add per extension; a second failure is under `Open:` with the recommended command                          |
| extension-fails      | "Set up Spec Kit." (`extension-add` fails once)                                   | No retry                        | The command ran once; `Extensions: ... failed`; leftover under `Open:`                                                                                             |
| config-ignores       | "Set up Spec Kit." (a Prettier ignore file exists, no ESLint config)              | Edits only existing configs     | `.specify/` and `.claude/skills/speckit-*/` added to the existing ignore file; no ESLint config created; `specs/` stays linted                                     |

## Running per model

Run every case on each model; a case passes only when all its `pass` lines hold. Record failures by id and model.
