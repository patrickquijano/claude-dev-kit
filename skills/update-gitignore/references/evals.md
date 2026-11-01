# Evals

Cases for `update-gitignore`: the choose question, secret exposure, and the analyst fallback. Test each on Haiku, Sonnet, and Opus.

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

| id                  | prompt                                                                      | expected                                                               | pass                                                                                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| new-candidates      | "Update .gitignore." (Node repo with untracked `node_modules/` and `dist/`) | Prints the lines per category, one choose ask, then appends            | One Add all \| Add high-confidence only \| Report only \| Stop ask, then the append with no further question; only the root `.gitignore` changes; every written path passes `check-ignore` |
| tracked-secret      | "Update .gitignore." (a tracked `.env`)                                     | Reports it, never reads or untracks it                                 | Name under `Secret exposure:` with the rotate advice; no `.env` contents read; no `git rm` run                                                                                             |
| nothing-to-do       | "Update .gitignore." (everything already ignored)                           | No ask, no write                                                       | No question; `Result: nothing-to-do`; `Added: none`                                                                                                                                        |
| analyst-unavailable | "Update .gitignore." (the subagent cannot be spawned)                       | Runs inventory, explore, and filter inline                             | Reads at most 40 files; same Output block; no stop                                                                                                                                         |
| unattended          | "Update .gitignore." (no way to ask, medium candidates only)                | Writes nothing                                                         | No question; nothing written; medium candidates under `Skipped:`; `Result: done`                                                                                                           |
| choose-stop         | "Update .gitignore." (the user picks Stop at the choose ask)                | Cancels, writes nothing                                                | `Result: cancelled`; `.gitignore` unchanged                                                                                                                                                |
| negation-round      | "Update .gitignore." (a written `!` negation path is not ignored)           | Removes the no-op negation line                                        | The negation line is removed with no question; the other written lines stay                                                                                                                |
| no-approval-step    | "Update .gitignore." (Node repo with untracked `node_modules/` and `dist/`) | Runs end to end; every write follows the last decision answer directly | Only the Add all, Add high-confidence only, Report only, or Stop ask appears; the append runs right after the answer; `Result: done`                                                       |
| auto-invoke         | A natural request for the action, no `/cdk:` command                        | Claude loads the skill on its own                                      | The skill runs; no approval step precedes any write                                                                                                                                        |
| grill-close-call    | A decision question whose top two totals are ≤5 apart                       | Table before the question; no Recommended                              | Table before the question; integer weights sum to 100; no Recommended; "close call" stated; unverified scores marked                                                                       |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
