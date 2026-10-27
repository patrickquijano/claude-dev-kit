# Evals

Cases for `create-git-tag`: parsing, guards, and confirmation. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
prompt: <the exact user message and repo state>
expected: <behavior>
pass: <observable criteria>
```

## Cases

| id                  | prompt                                                                          | expected                          | pass                                                                     |
| ------------------- | ------------------------------------------------------------------------------- | --------------------------------- | ------------------------------------------------------------------------ |
| not-a-repo          | "Tag the release from the changelog." (directory is not a git repo)             | Stops                             | `Stopped: 1: not a git repository: <path>`; no tag command               |
| no-changelog        | "Tag the release from the changelog." (no `CHANGELOG.md`)                       | Stops                             | `Stopped: 2: no changelog, no tag created`                               |
| unreleased-only     | "Tag the release from the changelog." (only `## [Unreleased]`)                  | Stops                             | `Stopped: 4: no dated version in CHANGELOG.md`; no question asked        |
| bracketless-heading | "Tag the release from the changelog." (`## 1.2.0 - <date>` newest)              | Tags `v1.2.0`                     | `Tag: v1.2.0`; `Pushed: no (local only)`                                 |
| tag-exists          | "Tag the release from the changelog." (`v1.2.0` already exists locally)         | Stops                             | `Stopped: 6: tag v1.2.0 already exists locally`; tag unchanged           |
| multiline-message   | "Tag the release from the changelog." (section has `### Added` and `### Fixed`) | Keeps heading lines in the tag    | `git tag -n99 <tag>` shows both `###` lines; `--cleanup=whitespace` used |
| decline-confirm     | "Tag the release from the changelog." (answer No at the confirm)                | Creates nothing                   | `Result: cancelled`; no tag exists afterward                             |
| auto-invoke         | A natural request for the action, no `/cdk:` command                            | Claude loads the skill on its own | The skill runs; its confirm still precedes `git tag -a`                  |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
