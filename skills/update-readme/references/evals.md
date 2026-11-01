# Evals

Cases for `update-readme`: create, score-only, the write step, template and layout questions, host-agnostic syntax, and the subagent fallbacks. Test each on Haiku, Sonnet, and Opus.

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

| id                    | prompt                                                        | expected                                                                                  | pass                                                                                                                                        |
| --------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| create-cli            | "Write a README." (CLI repo, no README)                       | Fills the cli template, writes, scores                                                    | Only `README.md` written, with no approval wait; Score printed; nothing committed                                                           |
| score-only            | "Score my README."                                            | Scores without writing                                                                    | No file changed; deductions listed                                                                                                          |
| below-pass            | "Improve my README." (score under 95)                         | Improves in rounds                                                                        | At most 3 improve rounds; leftovers under `Open:`; at the cap `Result: stopped`                                                             |
| rescore-always        | "Improve my README." (improver returns `Expected: 80→98/100`) | Rescores after every improve round                                                        | `Score:` comes from the round's fresh rescore, never `Expected:`; the last round at the cap is rescored                                     |
| gap-omit              | "Write a README." (no license file, user answers Omit)        | Leaves the item out                                                                       | `Omitted:` names it; no re-ask; C1 treated as N/A                                                                                           |
| subagents-unavailable | "Write a README." (no subagent can be spawned)                | Gathers facts, scores, and improves inline                                                | Same Output block; no stop                                                                                                                  |
| unattended            | "Write a README." (no way to ask)                             | Writes without asking                                                                     | Unanswerable items under `Omitted:`                                                                                                         |
| auto-invoke           | A natural request for the action, no `/cdk:` command          | Claude loads the skill on its own                                                         | The skill runs and carries out its steps with no approval step                                                                              |
| readme-in-place       | Only `.gitlab/README.md` exists                               | Edits it where it is                                                                      | Edited in place, never moved                                                                                                                |
| several-readmes       | READMEs in more than one location                             | Asks which one                                                                            | Asks which, root Recommended                                                                                                                |
| no-readme-creates     | No README                                                     | Creates it at the root                                                                    | Creates `README.md` at the root with no question before writing                                                                             |
| generic-host          | No remote, CI config present                                  | Adds no badge                                                                             | No badge added                                                                                                                              |
| host-syntax-converted | README has an alert, `[[_TOC_]]`, and a mermaid block         | Converts what is portable                                                                 | Alert and TOC converted and listed in the printed file list; mermaid kept and listed under `Open:`                                          |
| ambiguous-type        | Two types tie                                                 | Asks the weighted template question                                                       | Signals listed, weights sum to 100, one Recommended, heuristic statement shown                                                              |
| long-draft-asks-max   | Draft over 200 lines                                          | Asks the length                                                                           | Asks 200, 400, or 600, labeled community heuristics                                                                                         |
| modularize            | Draft over the max, non-monorepo                              | Splits into linked files                                                                  | No per-package option; every split file at most the max and linked                                                                          |
| no-invention          | Missing license                                               | Writes a TODO                                                                             | `TODO`, no invented link or version                                                                                                         |
| idempotent-rerun      | README set already conforms                                   | Writes nothing                                                                            | No file changed; `Result: nothing-to-do`                                                                                                    |
| verify-report         | Normal write                                                  | Verifies after writing                                                                    | `wc -l` result and link counts printed                                                                                                      |
| no-approval-step      | "Write a README." (CLI repo, no README)                       | Runs end to end with no approval step and no confirmation; side-effect steps run directly | No approval wait; each side-effect step runs directly after the decision questions                                                          |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
