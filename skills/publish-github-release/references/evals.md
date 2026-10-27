# Evals

Cases for `publish-github-release`: drafts, publish choices, and unattended runs. Test each on Haiku, Sonnet, and Opus.

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

| id                     | prompt                                                    | expected                                  | pass                                                                                                                 |
| ---------------------- | --------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| one-draft              | "Publish the release." (one draft, tag on origin)         | Asks Publish, then Latest or Pre-release  | Both picks asked; `remote-tag` run before the question; `Result: done`                                               |
| several-drafts         | "Publish the release." (three drafts)                     | Asks which draft                          | Offers the two newest, None of these, and Stop                                                                       |
| tag-missing-unattended | "Publish the release --yes" (draft, tag absent on origin) | Stops without publishing                  | `Stopped: 5: tag-missing`; the draft stays; `Next:` says to push the tag                                             |
| keep-draft             | "Publish the release." (user picks Keep as draft)         | Leaves the draft                          | `Action: keep as draft`; no publish command                                                                          |
| already-published      | "Publish the release --tag v1.0.0" (published)            | Stops                                     | `Stopped: 2: not-a-draft`; nothing edited                                                                            |
| auto-invoke            | A natural request for the action, no `/cdk:` command      | Claude loads the skill on its own         | The skill runs; its existing confirm or plan approval still precedes any write or push                               |
| grill-close-call       | A decision question whose top two totals are ≤5 apart     | Table before the question; no Recommended | Table before the question; integer weights sum to 100; no Recommended; "close call" stated; unverified scores marked |
| unattended-no-yes      | "Publish the release." (no way to ask, no `--yes`)        | Stops without publishing                  | `Stopped: 4: unattended, not confirmed`; the draft stays; nothing published                                          |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
