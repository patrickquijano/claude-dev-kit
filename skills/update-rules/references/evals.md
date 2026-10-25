# Evals

Cases for `update-rules`: create, score-only, conflicts, and the subagent fallbacks. Test each on Haiku, Sonnet, and Opus.

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

| id                    | prompt                                                | expected                                        | pass                                                                                                              |
| --------------------- | ----------------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| create-set            | "Write CLAUDE.md for this repo." (none exists)        | Fills the template, one confirm, writes, scores | One Proceed \| Revise \| Stop ask; only `CLAUDE.md` and `.claude/rules/**` written; always-loaded lines under 200 |
| score-only            | "Score my CLAUDE.md."                                 | Scores without writing                          | `Confirmed: n/a (score-only)`; no file changed; deductions listed                                                 |
| conflict-ask          | "Update the rules." (two files disagree)              | Asks, never resolves silently                   | One question per conflict with keep A, keep B, merge; unattended keeps the existing side                          |
| known-issues-move     | "Update the rules." (a `Known issues` section exists) | Moves it to auto memory                         | `feedback` memory plus `MEMORY.md` pointer listed in `Files:`; section removed                                    |
| subagents-unavailable | "Update the rules." (no subagent can be spawned)      | Gathers facts, scores, and improves inline      | Same Output block; no stop                                                                                        |
| below-pass            | "Improve my rules." (score under 95)                  | Improves in rounds                              | At most 3 improve rounds; leftovers under `Open:`                                                                 |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
