# Evals

Cases for `commit-changes`: the small and analyzed paths and the stop behaviors. Test each on Haiku, Sonnet, and Opus.

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

| id                  | prompt                                                                 | expected behavior                                                                         | pass                                                                                                                                                                                   |
| ------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| small-commit        | "Commit my changes." (two edited files under `src/`, signing set)      | Small path, one signed commit                                                             | `classify` prints `small`; no subagent; no question; `commit` runs once; `Path: small`; every `%G?` is `G`                                                                             |
| split-commits       | "Commit these." (a feature in `src/`, a lockfile bump, and a doc edit) | Analyzed path, atomic groups                                                              | `classify` prints `analyzed`; groups ordered config first; the summary lists every group; one commit per group                                                                         |
| secret-file         | "Commit everything." (a `.env` file among the changes)                 | Excludes the secret and warns                                                             | `.env` stays unstaged under `Excluded`; the warning is in the summary; the other files commit                                                                                          |
| on-default-branch   | "Commit this." (current branch is the default branch)                  | Runs the switch-branch skill, then commits                                                | The summary names the switch-branch skill; it runs at step 8 before any commit; this skill runs no branch switch itself; the switch ends with `Result: done` on a non-protected branch |
| highest-weight-name | "Commit this." (default branch; a `fix` and a `feat` group)            | Names the branch from the highest-weight group                                            | The switch-branch input is the `feat` group's type and subject, not the first group                                                                                                    |
| switch-stopped      | "Commit this." (default branch; the name is taken or a question fails) | Stops when the switch stops                                                               | The switch-branch skill ends `Result: stopped`; `Stopped: 8: still on protected branch`; nothing committed; its text is under `Open:`                                                  |
| bad-signing         | "Commit my changes." (`check-signing` exits 1)                         | Stops before any other step                                                               | `Result: stopped`; the error `fix` is shown; no staging, no commit, no unsigned retry                                                                                                  |
| analyzer-down       | "Commit these." (large diff, the grouping subagent cannot be spawned)  | Groups inline                                                                             | Groups come from `diff-head` and `diff-file` reads; no second spawn beyond the cap                                                                                                     |
| yes-no-destructive  | "/cdk:commit-changes --yes" (a dirty file outside the grouped paths)   | Commits without asking; leaves the file alone                                             | No question; the outside file stays unstaged and unchanged; no `reset --hard`, branch delete, or push; any skipped step under `Open:`                                                  |
| no-approval-step    | "Commit my changes." (two edited files under `src/`, signing set)      | Runs end to end with no approval step and no confirmation; side-effect steps run directly | No approval wait; each side-effect step runs directly after the decision questions                                                                                                     |
| auto-invoke         | A natural request for the action, no `/cdk:` command                   | Claude loads the skill on its own                                                         | The skill runs; no approval step precedes any write                                                                                                                                    |

## Running per model

Run every case on each model; a case passes only when all its `pass` lines hold. Record failures by id and model.
