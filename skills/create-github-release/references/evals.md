# Evals

Cases for `create-github-release`: tag choice, changelog notes, update merge, immutable retry, and guards. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
prompt: <the exact user message and repo state>
expected: <behavior>
pass: <observable criteria>
```

## Cases

| id                        | prompt                                                                           | expected                                           | pass                                                                                                                  |
| ------------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| create-asks-weighted-tag  | "Cut a release." (latest `v0.5.0`, 3 `feat` commits, changelog has `## [0.6.0]`) | Asks the tag question with weights                 | 2–4 options, weights sum to 100, `v0.6.0` Recommended first with "section present"; no write before the plan approval |
| notes-match-changelog     | "Create release v0.6.0." (section `## [0.6.0]` exists)                           | Notes equal the section body                       | `Notes:` is the section without its heading; `Notes source: CHANGELOG.md [0.6.0]`; no `--generate-notes`              |
| no-section-stops          | "Create release v0.7.0." (no `## [0.7.0]` section)                               | Stops before any write                             | `Result: stopped`; `Stopped: 5: no CHANGELOG.md section for 0.7.0`; `Next: add the section`; `CHANGELOG.md` unchanged |
| update-merges-notes       | "Update release v0.6.0." (body has a screenshot and `### Contributors`)          | Replaces only the changelog block                  | Screenshot and Contributors survive; `kept` lists Contributors; markers written; `Action: updated`                    |
| existing-release-switches | "Create release v0.6.0." (a release for `v0.6.0` exists)                         | Switches to the update path                        | `Action: updated`; no `gh release create` call                                                                        |
| draft-vs-published-asked  | "Create release v0.6.0." (a workflow triggers on `release`)                      | Asks draft or published with weights               | Draft weighted higher with the workflow as evidence; the choice is in the approved plan                               |
| immutable-retry-capped    | "Update release v0.6.0." (GitHub rejects the edit as immutable)                  | Reports, re-enters plan mode, retries the next tag | Error line reported; `EnterPlanMode` before each retry; at most 2 rounds                                              |
| no-commits-offers-stop    | "Cut a release." (no commits since the latest release)                           | Says so and includes Stop                          | A `Stop` option is listed; no write                                                                                   |
| gh-flag-missing-fallback  | "Cut a release." (`gh release edit --help` lacks `--notes-file`)                 | Uses the `gh api` PATCH                            | `Tool: gh api`; body sent with `-F body=@<file>`, never inline                                                        |
| unattended-stops          | "Cut a release." (run with no one to ask)                                        | Stops at the first question                        | `Result: stopped`; nothing written or created                                                                         |
| auto-invoke               | "Can you publish a GitHub release for the new version?" (no `/cdk:` command)     | Claude loads the skill on its own                  | The skill runs; plan approval still precedes any `gh release create` or `edit`                                        |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
