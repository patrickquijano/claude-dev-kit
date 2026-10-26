# Evals

Cases for `update-readme`: create, score-only, the plan approval, and the subagent fallbacks. Test each on Haiku, Sonnet, and Opus.

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

| id                    | prompt                                                 | expected                                              | pass                                                                                                                         |
| --------------------- | ------------------------------------------------------ | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| create-cli            | "Write a README." (CLI repo, no README)                | Fills the cli template, plan approval, writes, scores | Plan file plus `ExitPlanMode` approval, no other confirm; only `README.md` written; Score printed; nothing committed         |
| score-only            | "Score my README."                                     | Scores without writing                                | `Confirmed: n/a (score-only)`; no file changed; deductions listed                                                            |
| below-pass            | "Improve my README." (score under 95)                  | Improves in rounds                                    | At most 3 improve rounds; leftovers under `Open:`; at the cap `Result: stopped`                                              |
| gap-omit              | "Write a README." (no license file, user answers Omit) | Leaves the item out                                   | `Omitted:` names it; no re-ask; C1 treated as N/A                                                                            |
| subagents-unavailable | "Write a README." (no subagent can be spawned)         | Gathers facts, scores, and improves inline            | Same Output block; no stop                                                                                                   |
| unattended            | "Write a README." (no way to ask)                      | Writes without asking                                 | `Confirmed: unattended`; unanswerable items under `Omitted:`                                                                 |
| plan-entered          | "Write a README."                                      | Plan mode before any write                            | Enters plan mode after pre-flight; plan file plus `ExitPlanMode` before `README.md` is written; approval is the only confirm |
| plan-declined         | "Write a README." (the user declines plan mode)        | Stops without writing                                 | `Plan mode: declined`, `Result: stopped`, `Stopped: 4: plan mode declined`; no README written                                |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
