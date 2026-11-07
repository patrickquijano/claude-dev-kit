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

| id                     | prompt                                                                  | expected                                                               | pass                                                                                                                                              |
| ---------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| create-cli             | "Write a README." (CLI repo, no README)                                 | Fills the cli template, writes, scores                                 | Only `README.md` written, with no approval wait; Score printed; nothing committed                                                                 |
| score-only             | "Score my README."                                                      | Scores without writing                                                 | No file changed; deductions listed                                                                                                                |
| below-pass             | "Improve my README." (score under 95)                                   | Improves in rounds                                                     | At most 3 improve rounds before the extend ask; Stop puts leftovers under `Open:` and `Result: stopped`                                           |
| rescore-always         | "Improve my README." (implement-spec reports every goal met)            | Rescores after every improve round                                     | `Score:` comes from the round's fresh rescore, never implement-spec's own report; the last round at the cap is rescored                           |
| gap-omit               | "Write a README." (no license file, user answers Omit)                  | Leaves the item out                                                    | `Omitted:` names it; no re-ask; C1 treated as N/A                                                                                                 |
| subagents-unavailable  | "Write a README." (no subagent can be spawned)                          | Gathers facts, scores, and improves inline                             | Same Output block; no stop                                                                                                                        |
| unattended             | "Write a README." (no way to ask)                                       | Writes without asking                                                  | Unanswerable items under `Omitted:`                                                                                                               |
| auto-invoke            | A natural request for the action, no `/cdk:` command                    | Claude loads the skill on its own                                      | The skill runs and carries out its steps with no approval step                                                                                    |
| readme-in-place        | Only `.gitlab/README.md` exists                                         | Edits it where it is                                                   | Edited in place, never moved                                                                                                                      |
| several-readmes        | READMEs in more than one location                                       | Asks which one                                                         | Asks which, root Recommended                                                                                                                      |
| no-readme-creates      | No README                                                               | Creates it at the root                                                 | Creates `README.md` at the root with no location question                                                                                         |
| generic-host           | No remote, CI config present                                            | Adds no badge                                                          | No badge added                                                                                                                                    |
| host-syntax-converted  | README has an alert, `[[_TOC_]]`, and a mermaid block                   | Converts what is portable                                              | Alert and TOC converted and listed in the printed file list; mermaid kept and listed under `Open:`                                                |
| ambiguous-type         | Two types tie                                                           | Asks the weighted template question                                    | Signals listed, weights sum to 100, one Recommended, heuristic statement shown                                                                    |
| long-draft-asks-max    | Draft over 200 lines                                                    | Asks the length                                                        | Asks 200, 400, or 600, labeled community heuristics                                                                                               |
| modularize             | Draft over the max, non-monorepo                                        | Splits into linked files                                               | No per-package option; every split file at most the max and linked                                                                                |
| no-invention           | Missing license                                                         | Writes a TODO                                                          | `TODO`, no invented link or version                                                                                                               |
| idempotent-rerun       | README set already conforms                                             | Writes nothing                                                         | No file changed; `Result: nothing-to-do`                                                                                                          |
| verify-report          | Normal write                                                            | Verifies after writing                                                 | `wc -l` result and link counts printed                                                                                                            |
| no-approval-step       | "Write a README." (CLI repo, no README)                                 | Runs end to end; every write follows the last decision answer directly | Only the decision questions in the flow are asked; the README is written right after them with no confirm question; `Result: done`                |
| improve-implement-spec | "Improve my README." (score under 95)                                   | Writes only through implement-spec                                     | One implement-spec invocation per round with a Spec brief (`Tests: none (documentation)`); no formatter or linter run                             |
| waiver                 | "Score my README." (a wording-only nit)                                 | Waives the negligible item                                             | Item under `Waived:` with file:line and reason; full points; never in `Open:`                                                                     |
| extend-at-cap          | "Improve my README." (score under 95 after 3 rounds)                    | Asks to extend                                                         | Asks the `Extend 3 more rounds` or `Stop` ask; `--yes` → Stop with the rest under `Open:`                                                         |
| memory-reuse           | "Improve my README." (a `cdk-fix-readme-*` memory matches an open item) | Reuses the stored fix, then records new ones                           | The memory's fix is in the goal's After text; a confirmed fix updates one `cdk-fix-readme-<rubric-id>-<slug>` memory plus one `MEMORY.md` pointer |
| not-changelog          | "Update the CHANGELOG."                                                 | Skill does not load                                                    | update-readme not invoked; no README read or written                                                                                              |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
