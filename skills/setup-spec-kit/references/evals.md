# Evals

Cases for `setup-spec-kit`: the main path, the unattended path, and the failure caps. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
prompt: <the exact user message>
expected: <behavior>
pass: <observable criteria, one per line>
```

## Cases

| id                 | prompt                                                               | expected behavior                                                                         | pass                                                                                                                          |
| ------------------ | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| fresh-setup        | "Set up Spec Kit in this repo." (CLI present, no `.specify/`)        | Init, three extensions, ignores                                                           | The extensions get priorities 10, 20, and 30 in that order; no `--force`; the four `.gitignore` lines added                   |
| rerun              | "Set up Spec Kit." (everything already done)                         | Changes nothing                                                                           | Every step skipped; `Result: nothing-to-do`; no file changed                                                                  |
| install-fails      | "Set up Spec Kit." (CLI missing, the install command fails)          | Stops at step 1                                                                           | The error line is quoted; `Result: stopped`; nothing installed                                                                |
| non-empty-init     | "Set up Spec Kit." (a non-empty project needs `init-here`)           | Runs `init-here` with no question                                                         | `init-here` runs; no question asked                                                                                           |
| missing-skill-dirs | "Set up Spec Kit." (an extension's skill dirs are missing)           | One reinstall                                                                             | At most one remove and add per extension; a second failure is under `Open:` with the recommended command                      |
| extension-fails    | "Set up Spec Kit." (`extension-add` fails once)                      | No retry                                                                                  | The command ran once; `Extensions: ... failed`; leftover under `Open:`                                                        |
| config-ignores     | "Set up Spec Kit." (a Prettier ignore file exists, no ESLint config) | Edits only existing configs                                                               | `.specify/` and `.claude/skills/speckit-*/` added to an existing ignore file; no ESLint config created; `specs/` stays linted |
| no-approval-step   | "Set up Spec Kit in this repo." (CLI present, no `.specify/`)        | Runs end to end with no approval step and no confirmation; side-effect steps run directly | No approval wait; each side-effect step runs directly after the decision questions                                            |

## Running per model

Run every case on each model; a case passes only when all its `pass` lines hold. Record failures by id and model.
