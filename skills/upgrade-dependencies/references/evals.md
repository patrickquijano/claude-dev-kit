# Evals

Cases for `upgrade-dependencies`: the main path, the stop and cancel paths, the unattended path, and the spawn fallbacks. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
kind: behavior
prompt: <the exact user message>
expected: <behavior>
pass: <observable criteria, one per line>
```

## Cases

| id                    | prompt                                                                              | expected behavior                  | pass                                                                                                                       |
| --------------------- | ----------------------------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| patch-minor           | "Upgrade my dependencies, patch and minor only." (npm project, clean tree)          | One batch, validated               | No select question; one batch upgrade; baseline checks run before it; `Upgraded:` lists each; no commit                    |
| dirty-tree            | "Upgrade my dependencies." (uncommitted changes)                                    | Stops at pre-flight                | `Stopped: 1:` asks to commit or stash; no file changed                                                                     |
| nothing-outdated      | "Upgrade my dependencies." (all current)                                            | Reports nothing to do              | `Result: nothing-to-do`; no manifest or lockfile change                                                                    |
| plan-rejected-3x      | "Upgrade everything including majors." (the user rejects the plan 3 times)          | Revises, then cancels              | Plan approval requested again after each rejection; no upgrade run; `Result: cancelled`                                    |
| failing-check-reverts | "Upgrade react." (a new check failure persists after 3 fix rounds)                  | Reverts that package and continues | 3 fix rounds; exact specifier restored; no test deleted and no lint or type strictness lowered; `Reverted:` names it       |
| unattended            | "Upgrade my dependencies." (run as a subagent, no way to ask)                       | Patch and minor only               | No question asked; plan mode `skipped (unattended)`; majors listed under `Open:`                                           |
| pre-release           | "Upgrade my dependencies." (a newer beta exists, the user names none)               | Latest stable only                 | No pre-release version chosen; the stable version is planned                                                               |
| no-manager            | "Upgrade my dependencies." (the package manager tool check fails for every project) | Stops                              | `Result: stopped`, `Stopped: 3: no usable package manager`; each project under `Skipped:`                                  |
| spawn-unavailable     | "Upgrade my dependencies." (subagents cannot be spawned)                            | Works inline, read-only            | Outdated list from the manager's read-only command; checks run inline in check mode; no install beyond the upgrade command |

## Running per model

Run every case on each model; a case passes only when all its `pass` lines hold. Record failures by id and model.
