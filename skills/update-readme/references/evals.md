# Evals

Cases for `update-readme`: create, score-only, the Confirm gate, template and layout questions, host-agnostic syntax, and the subagent fallbacks. Test each on Haiku, Sonnet, and Opus.

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

| id                    | prompt                                                               | expected                                         | pass                                                                                                                                        |
| --------------------- | -------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| create-cli            | "Write a README." (CLI repo, no README)                              | Fills the cli template, Confirms, writes, scores | Confirm Yes, no plan file; only `README.md` written; Score printed; nothing committed                                                       |
| score-only            | "Score my README."                                                   | Scores without writing                           | `Confirmed: n/a (score-only)`; no file changed; deductions listed                                                                           |
| below-pass            | "Improve my README." (score under 95)                                | Improves in rounds                               | At most 3 improve rounds; leftovers under `Open:`; at the cap `Result: stopped`                                                             |
| gap-omit              | "Write a README." (no license file, user answers Omit)               | Leaves the item out                              | `Omitted:` names it; no re-ask; C1 treated as N/A                                                                                           |
| subagents-unavailable | "Write a README." (no subagent can be spawned)                       | Gathers facts, scores, and improves inline       | Same Output block; no stop                                                                                                                  |
| unattended            | "Write a README." (no way to ask)                                    | Writes without asking                            | `Confirmed: unattended`; unanswerable items under `Omitted:`                                                                                |
| confirm-gate          | "Write a README."                                                    | Confirm before any write                         | Confirm Yes before `README.md` is written; it is the only confirm                                                                           |
| confirm-declined      | "Write a README." (the user answers No at the Confirm)               | Cancels without writing                          | `Result: cancelled`; no README written                                                                                                      |
| fix-round-plan-mode   | "Improve my README." (score under 95, round 1 plan rejected 3 times) | Enters plan mode before any improve edit         | Round k calls `EnterPlanMode` before the improver edits; a rejected plan applies nothing; `Result: cancelled`, `Stopped: 15: plan rejected` |
| auto-invoke           | A natural request for the action, no `/cdk:` command                 | Claude loads the skill on its own                | The skill runs; its existing confirm or plan approval still precedes any write or push                                                      |
| readme-in-place       | Only `.gitlab/README.md` exists                                      | Edits it where it is                             | Edited in place, never moved                                                                                                                |
| several-readmes       | READMEs in more than one location                                    | Asks which one                                   | Asks which, root Recommended                                                                                                                |
| no-readme-asks        | No README                                                            | Asks before creating                             | Asks Create at root \| Stop before writing                                                                                                  |
| generic-host          | No remote, CI config present                                         | Adds no badge                                    | No badge added                                                                                                                              |
| host-syntax-converted | README has an alert, `[[_TOC_]]`, and a mermaid block                | Converts what is portable                        | Alert and TOC converted and listed in the Confirm; mermaid kept and listed under `Open:`                                                    |
| ambiguous-type        | Two types tie                                                        | Asks the weighted template question              | Signals listed, weights sum to 100, one Recommended, heuristic statement shown                                                              |
| long-draft-asks-max   | Draft over 200 lines                                                 | Asks the length                                  | Asks 200, 400, or 600, labeled community heuristics                                                                                         |
| modularize            | Draft over the max, non-monorepo                                     | Splits into linked files                         | No per-package option; every split file at most the max and linked                                                                          |
| no-invention          | Missing license                                                      | Writes a TODO                                    | `TODO`, no invented link or version                                                                                                         |
| idempotent-rerun      | README set already conforms                                          | Writes nothing                                   | No file changed; `Result: nothing-to-do`                                                                                                    |
| verify-report         | Normal write                                                         | Verifies after writing                           | `wc -l` result and link counts printed                                                                                                      |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
