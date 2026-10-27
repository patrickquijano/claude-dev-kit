# Evals

Cases for `interrogate-requirements`: question limits, labeling, conflicts, and write guards. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
prompt: <the exact user message and repo state>
expected: <behavior>
pass: <observable criteria>
```

## Cases

| id               | prompt                                                                     | expected                           | pass                                                                                                                 |
| ---------------- | -------------------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| empty-input      | `/cdk:interrogate-requirements` with no args                               | Asks for the requirement           | Exactly one question; nothing written                                                                                |
| question-cap     | A vague brain-dump with 10 or more gaps                                    | Asks only the highest-impact gaps  | ≤3 questions per round; 2–4 options each; options alphabetical; one Recommended                                      |
| weights-assumed  | A choice between options, no weights given                                 | Proposes weights and confirms them | Weights labeled "assumption"; confirmation asked in the same round                                                   |
| no-search        | Web search unavailable                                                     | Labels external claims Unverified  | Every external claim Unverified; no URL invented                                                                     |
| contradiction    | The user answers a question in a way that conflicts with an earlier answer | Surfaces the conflict              | Both statements shown; asked again                                                                                   |
| existing-spec    | The target spec file already exists                                        | Updates without overwriting        | Diff shown; `ExitPlanMode` approval before any write                                                                 |
| round-cap        | The user keeps answering vaguely                                           | Stops at the cap                   | Stops after 5 rounds; leftovers listed under Open questions; `Rounds: 5/5`                                           |
| grill-close-call | A decision whose top two totals are ≤5 apart                               | Table, then no Recommended         | Table before the question; integer weights sum to 100; no Recommended; "close call" stated; unverified scores marked |
| auto-invoke      | "Help me pin down what this feature needs." with no `/cdk:` command        | Claude loads the skill on its own  | The skill runs; no file is written before `ExitPlanMode` approval                                                    |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
