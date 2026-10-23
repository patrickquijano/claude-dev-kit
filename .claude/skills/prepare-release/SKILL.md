---
name: prepare-release
description: Updates the README, bumps the plugin version, cuts the matching changelog release, then commits once and pushes. Use only when the user explicitly asks to prepare a release, or when chained.
---

# Prepare release

Input: $ARGUMENTS

## Rules

- Rigor: never guess or invent: confirm each path, command, and fact by reading it; ask (unattended: record) what the input and repo cannot answer. Finish every step in full, think twice before each irreversible step, and re-check the result against these rules and the repo's standards before reporting.
- Efficiency: read only what a step needs, keep output terse, and take the fewest steps that meet the goal; when work is autonomous and splits cleanly, spawn independent cdk subagents in one parallel turn (`cdk:task-worker` for read-only work, `cdk:plan-implementer` for edits), never `Explore` or `general-purpose`.
- Chain each skill step through the Skill tool in the main thread, in order; the only agent is `cdk:change-analyzer` in step 2; never `context: fork`.
- Never hand-edit the version or the changelog; the chained skills write them. A failed step → stop, report it under `Open:`, run no later step.
- Commit only at the last step, right before the push; no `cdk:commit-changes` run after pre-flight until then.
- The plugin version is bumped first and the changelog release takes that same version; the newest released version in `CHANGELOG.md` and the `version` in `.claude-plugin/plugin.json` must be equal before the final commit; unequal → stop.
- Running this skill is consent for commit + push to the current branch (normal, non-force); never force-push, never push to `main` directly.

## Workflow

1. **Pre-flight.** Read `.claude/release-policy.json` and `CHANGELOG.md`; no uncommitted changes and no branch commits ahead of the default branch → `Result: nothing-to-do`.
2. **Subject.** Uncommitted changes exist → spawn `cdk:change-analyzer` for the Conventional Commit subjects of the pending changes and write the one setting the highest SemVer level (a `!` or `BREAKING CHANGE:` footer outranks `feat`, which outranks the rest) as one line to a scratchpad file; the bump needs it because nothing is committed yet. No uncommitted changes → no file.
3. **Readme.** Invoke `cdk:update-readme` to bring `README.md` in line with the changes.
4. **Version.** Invoke `cdk:bump-version` with `subject <file>` when step 2 wrote one, to set `.claude-plugin/plugin.json` to the version the branch commits and that subject require; it asks for confirmation each time. Read the resulting `version`.
5. **Changelog.** Invoke `cdk:update-changelog` with `release <version>` (the version from step 4) to cut a dated release from `Unreleased`; ask no other version.
6. **Verify.** Read the newest `## [x.y.z]` heading in `CHANGELOG.md` and `version` in `.claude-plugin/plugin.json`; they differ → stop.
7. **Commit and push.** Invoke `cdk:commit-changes` once for every pending change (the earlier work, README, changelog, and version files), then push to the current branch (commit + push, normal non-force).

## Output

```text
Readme: updated | unchanged | failed
Changelog: <x.y.z> | failed
Version: <x.y.z> | failed
Commits: <n> pushed to <branch> | none
Open: <what is left | none>
Next: /cdk:prepare-change-request | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
