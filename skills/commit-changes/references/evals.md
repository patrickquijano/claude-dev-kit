# Evals

Cases for `commit-changes`: the small and analyzed paths, the single confirmation, and the stop behaviors. Test each on Haiku, Sonnet, and Opus.

## Contents

- Template · Cases · Running per model

## Template

```text
id: <kebab-case>
prompt: <the exact user message>
expected: <behavior>
pass: <observable criteria, one per line>
```

## Cases

| id                | prompt                                                                 | expected behavior              | pass                                                                                                              |
| ----------------- | ---------------------------------------------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------- |
| small-commit      | "Commit my changes." (two edited files under `src/`, signing set)      | Small path, one signed commit  | `classify` prints `small`; no subagent; one question; `commit` runs once; `Path: small`; every `%G?` is `G`       |
| split-commits     | "Commit these." (a feature in `src/`, a lockfile bump, and a doc edit) | Analyzed path, atomic groups   | `classify` prints `analyzed`; groups ordered config first; one question listing every group; one commit per group |
| secret-file       | "Commit everything." (a `.env` file among the changes)                 | Excludes the secret and warns  | `.env` stays unstaged under `Excluded`; the warning is in the plan; the Recommended option is Stop                |
| staged-before-ask | "Commit my changes." (files are already staged, the user picks Stop)   | Changes nothing before consent | No `unstage` run; `Result: cancelled`; `git status` identical to the start                                        |
| on-default-branch | "Commit this." (current branch is the default branch)                  | Plans a branch switch          | The plan shows `Branch: main → <type>/<name>`; `switch-new` runs only after Commit                                |
| bad-signing       | "Commit my changes." (`check-signing` exits 1)                         | Stops before any other step    | `Result: stopped`; the error `fix` is shown; no staging, no commit, no unsigned retry                             |
| unattended        | "Commit these changes." (run as a subagent, no way to ask)             | Stops at the confirm           | `Stopped: 7: unattended, not confirmed`; the plan is under `Open:`; nothing staged or committed                   |
| analyzer-down     | "Commit these." (large diff, the grouping subagent cannot be spawned)  | Groups inline                  | Groups come from `diff-head` and `diff-file` reads; no second spawn beyond the cap                                |

## Running per model

Run every case on each model; a case passes only when all its `pass` lines hold. Record failures by id and model.
