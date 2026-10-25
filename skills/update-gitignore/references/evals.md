# Evals

Cases for `update-gitignore`: plan mode, secret exposure, and the analyst fallback. Test each on Haiku, Sonnet, and Opus.

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

| id                  | prompt                                                                      | expected                                                                    | pass                                                                                                                                                                                             |
| ------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| new-candidates      | "Update .gitignore." (Node repo with untracked `node_modules/` and `dist/`) | Prints the lines per category, one choose ask, then plan mode, then appends | One Add all \| Add high-confidence only \| Report only \| Stop ask, then `ExitPlanMode` approval before the append; only the root `.gitignore` changes; every written path passes `check-ignore` |
| tracked-secret      | "Update .gitignore." (a tracked `.env`)                                     | Reports it, never reads or untracks it                                      | Name under `Secret exposure:` with the rotate advice; no `.env` contents read; no `git rm` run                                                                                                   |
| nothing-to-do       | "Update .gitignore." (everything already ignored)                           | No ask, no write                                                            | No plan file; `Result: nothing-to-do`; `Confirmed: n/a (nothing to do)`                                                                                                                          |
| analyst-unavailable | "Update .gitignore." (the subagent cannot be spawned)                       | Runs inventory, explore, and filter inline                                  | Reads at most 40 files; same Output block; no stop                                                                                                                                               |
| unattended          | "Update .gitignore." (no way to ask, medium candidates only)                | Writes nothing                                                              | `Plan mode: skipped (unattended)`; `Confirmed: unattended`; medium candidates under `Skipped:`; `Result: done`                                                                                   |
| plan-declined       | "Update .gitignore." (the user declines plan mode)                          | Stops, writes nothing                                                       | `Stopped: 5: plan mode declined`; `Result: stopped`; `.gitignore` unchanged                                                                                                                      |
| plan-rejected       | "Update .gitignore." (the user rejects the plan 3 times)                    | Revises twice, then cancels                                                 | `Result: cancelled`; `Stopped: 5: plan rejected`; `Confirmed: no (stopped)`; `.gitignore` unchanged                                                                                              |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
