# Evals

Cases for `setup-husky`: the main path, the single confirmation, the stop and unattended paths, and the kept-file and failure paths. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
kind: behavior
prompt: <the exact user message>
expected: <behavior>
pass: <observable criteria, one per line>
```

## Cases

| id                  | prompt                                                                                   | expected behavior                          | pass                                                                                                                                                                                    |
| ------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| fresh-install       | "Set up Husky with commitlint." (npm project, no hooks)                                  | Installs, inits, copies hooks, smoke tests | One "Apply" or "Stop" question before the first install; `commit-msg` stub and `.mjs` copied; `.husky/_/` ignored; smoke test passes valid, past-tense, and 73-char headers as expected |
| rerun               | "Set up Husky." (everything already in place)                                            | Changes nothing                            | Every step skipped; `Result: nothing-to-do`; no file changed                                                                                                                            |
| writes-declined     | "Set up Husky." (the user picks Stop)                                                    | Installs and writes nothing                | `Stopped: 5: writes declined`; `Result: cancelled`; no dependency added                                                                                                                 |
| no-repo             | "Set up Husky." (not a git repository)                                                   | Stops at pre-flight                        | `Stopped: 1:` with "not a git repository"; no write                                                                                                                                     |
| kept-user-hook      | "Set up Husky." (a user `commit-msg` file differs from the canonical one)                | Never overwrites it                        | File kept; its diff and the way to overwrite it are reported                                                                                                                            |
| other-hook-owner    | "Set up Husky." (lefthook is already installed)                                          | Asks before replacing it                   | One question naming the existing owner; unattended: the recommended option is taken and listed under `Open:`                                                                            |
| init-guards-prepare | "Set up Husky." (`scripts.prepare` and `.husky/pre-commit` exist, Husky not initialized) | Snapshots then restores or merges          | `prepare` merged, not overwritten; the existing `pre-commit` restored; no placeholder `pre-commit` left                                                                                 |
| install-fails       | "Set up Husky." (the add command fails)                                                  | Stops after one attempt                    | The error line is quoted; no retry; `Result: stopped`                                                                                                                                   |
| unattended          | "Set up Husky." (run as a subagent, no way to ask)                                       | Applies recommended options                | No question asked; the recommended choices are listed under `Open:`                                                                                                                     |

## Running per model

Run every case on each model; a case passes only when all its `pass` lines hold. Record failures by id and model.
