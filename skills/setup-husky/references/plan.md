# Plan

Detail for the plan printed at the end of step 5 of `SKILL.md`.

## Plan

- Steps 2–5 only read, ask with AskUserQuestion, and run the read-only commands (`hooks-path`, package manager detection). A missing `package.json` is only noted until the plan is printed.
- At the end of step 5 print the plan: the installs (packages), the files to write (`package.json` when missing, hooks, commitlint config, `.claude/rules/commits.md`, `.gitignore`, `.gitattributes`, tool ignores), the `prepare` merge, the effects (`husky-init`, `run-prepare`, the smoke test commits nothing). Then create the missing `package.json` and continue at step 6 with no wait.
- **Each fix round.** Before applying round k's fixes, print the round's items (cause, chosen fix) and the files each touches, then apply them.
- A kept user file is never replaced; it is reported at its step.
