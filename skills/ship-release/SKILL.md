---
name: ship-release
description: Ship current changes end to end through a GitHub pull request or GitLab merge request. Switch off a protected branch, make atomic signed commits, update the version, changelog, and README, create or update the PR or MR, review it with labeled inline comments, address open items and re-review (up to 3 rounds), merge when clean (squash and branch deletion asked once), sync the target branch, and summarize. Continues past blockers and reports them. Use only when the user explicitly asks to ship a change through a pull request or merge request, e.g. "ship this", "commit, open a PR, review, and merge". Not for tagging or publishing a GitHub Release (use create-github-release).
argument-hint: '[--target <branch>]'
allowed-tools: Bash(git --version) Bash(node --version) Bash(npx --version) Bash(gh --version) Bash(glab --version) Bash(git rev-parse *) Bash(git status *) Bash(git remote get-url *) Bash(git fetch --prune origin) Bash(git for-each-ref *) Bash(git rev-list *) Bash(git merge-base *) Bash(git cherry *) Bash(gh run list *) Bash(gh run view *) Bash(git symbolic-ref --short refs/remotes/origin/HEAD) Bash(git log *) Bash(git diff *) Bash(node *release-check.mjs *) Bash(rm -f -- *cdk-ship-release) Bash(gh auth status) Bash(glab auth status) Bash(gh pr list *) Bash(gh pr view *) Bash(gh pr checks *) Bash(glab mr list *) Bash(glab mr view *) Bash(gh api repos/{owner}/{repo}/branches/{branch} --jq .protected)
---

# Ship Release

Input: $ARGUMENTS

## Rules

- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Orchestration per `${CLAUDE_SKILL_DIR}/../build-skill/references/orchestration.md`; this skill runs in the main thread, chains skills via the Skill tool, and repeats none of their git, `gh`, or `glab` work.
- Host from `origin-url`: `github.com` → GitHub PR flow (`gh`); any other host → GitLab MR flow (`glab`).
- Invoking this skill is the consent for atomic signed commits, normal pushes, creating or updating the PR or MR, posting reviews and replies, and merging a clean PR or MR (not draft, conflict-free, required checks passing, never `--admin`). Squash and source-branch deletion are asked once (step 6).
- Never force-push, `--admin`, `--no-verify`, `git reset --hard`, or delete `main`. Never bypass a hook, check, or required review.
- Every step is idempotent and resumes from the observed state (branch, commits, PR or MR, version, merge state), so a re-run continues instead of repeating.
- Caps: 3 review-address-re-review rounds, 2 check waits of 30 minutes each, 2 blocker attempts per blocker; a cap hit stops that step and follows `## Blockers` (`${CLAUDE_SKILL_DIR}/references/blockers.md`).
- Own PR or MR: GitHub rejects a self `APPROVE` or `REQUEST_CHANGES`, so the review is posted as `COMMENT` and a clean verdict (no `(blocking)` comment) with passing required checks counts as approval; any `(blocking)` comment counts as changes requested. GitLab approves for real when the project allows author approval, else the same rule.
- Review comments use Conventional Comments: `issue (blocking)` (critical, high), `suggestion (non-blocking)` (medium, low), `question`, `nitpick`.
- AskUserQuestion unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/references/fallbacks.md` (squash and delete default to the recommended options).
- Final step: follow `${CLAUDE_SKILL_DIR}/../build-skill/references/resolve-findings.md` (scope: ask-only; sources: `Blockers:` entries, `Release: not shipped`, `Steps: … incomplete`, `Main: not synced`, `Merged: no (<reasons>)`, open `Resolution:` lines of the chained skills).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/references/known-issues.md` with slug `ship-release` and store `${CLAUDE_PLUGIN_DATA}/known-issues`.

## Workflow

1. **Pre-flight.** `git-version`, `node-version`, `npx-version`, plus `gh-version` or `glab-version`; `root`; auth (`gh-auth` or `glab-auth`); signing, target, `fetch`. Any failure → blocker; a pre-flight stop prints `Resolution: not run (stopped)` and ends the run. Otherwise write the hold marker last (Write tool, absolute path from `marker-path`); the plugin's end-of-task hook skips this tree until step 10 deletes it. Detail: `${CLAUDE_SKILL_DIR}/references/preflight.md`.
2. **Resume detection.** Current = `current-branch`; its PR or MR = the open one (`gh-pr-list`, or `glab-mr-list`), else the latest. Merged or nothing to ship → step 9; open PR or MR with a clean tree → step 5; else continue at step 3. Detail: `${CLAUDE_SKILL_DIR}/references/resume.md`.
3. **Branch.** On the target or a protected branch (per `conventions.md` `## Protected branch`) with changes (dirty tree, or `unshipped-count` > 0) → invoke `cdk:switch-branch`; step 9 then reconciles local `<target>`.
4. **Commit.** Dirty tree → invoke `cdk:commit-changes` (atomic, signed, pushed). A clean tree with unpushed commits needs no step here; step 7 pushes them.
5. **Release files.** `.claude/release-policy.json` present → invoke `cdk:bump-version target <target>` (it always asks the user to confirm the bump, and chains `cdk:write-changelog`); else invoke `cdk:write-changelog base <target>` (creates `CHANGELOG.md` when missing). The shipped change alters documented behavior, setup, config, usage, or examples (compare `target-diff` with the README sections) → invoke `cdk:write-readme`. Dirty tree → invoke `cdk:commit-changes`. Each skill is idempotent, so this step also runs after every fix round (step 8).
6. **Merge options.** One AskUserQuestion with two questions: Squash (`Squash into one commit` Recommended | `Keep commits`) and Delete source branch (`Delete branch` Recommended | `Keep branch`). Asked once per run, before the first review; the answers go to every later step.
7. **PR or MR.** Invoke `cdk:prepare-change-request --target <target> --yes --squash <yes|no> --delete-branch <yes|no>`; it detects the host. GitLab applies squash and delete at creation (the MR carries them); GitHub takes them at step 8.1 (the review merges). It fills the repository template (or its bundled one), sets the title, and assigns self; an existing PR or MR is updated. Keep the number or iid. `stopped` → blocker `PR/MR create`.
8. **Review loop** (up to 3 rounds). Always run the review: it also merges a PR or MR that is already clean. Per round: invoke `cdk:review-change-request`; merged → step 9; pending checks → `checks-watch`; blockers or open items → `cdk:address-change-request-review`, then step 5. Detail: `${CLAUDE_SKILL_DIR}/references/review-loop.md`.
9. **Sync target.** `switch-target`, `fetch`, `ff-target`. A dirty tree is a blocker; never reset. A non-fast-forward is allowed only for pre-release commits already in the merge: `${CLAUDE_SKILL_DIR}/references/sync.md`.
10. **Resolve findings.** Per resolve-findings.md; record a fix per known-issues.md only when the issue recurs. Then delete the marker (`remove-marker`); this runs on every path out of the run after step 1 wrote it, including a stop and a skipped step 9.
11. **Output.** Print `## Output`.

## Blockers

Applies to every step; blockers are reported, never asked. A blocked step does not end the run: run every step that does not depend on it and is still safe. Investigate, resolve safely (at most 2 attempts), record when unresolved, continue per the table, honest result: `${CLAUDE_SKILL_DIR}/references/blockers.md`.

## Output`

## Blockers

Applies to every step; blockers are reported, never asked. A blocked step does not end the run: run every step that does not depend on it and is still safe.

1. **Investigate.** In order: the failing command's exact output; the known-issues store per known-issues.md (slug `ship-release`), auto memory, and `.claude/rules/`; CI logs (`gh run list --branch <b>` then `gh run view <id> --log-failed`, or `glab ci` job logs); the chained skill's `Stopped:`, `Blocked:`, and `Resolution:` lines; for an external tool or host error, the official docs via `cdk:topic-researcher` (cited sources). Write down the root cause, or `unknown` with what was ruled out.
2. **Resolve safely.** At most 2 attempts per blocker, each backed by evidence.
   - Allowed: re-run after a transient error, run a missing documented step, fix code or config in the working tree through the chained skills, re-run a chained skill with corrected input.
   - Never: `--no-verify`, `--admin`, force-push, `git reset --hard`, editing the release policy or a check to make it pass, skipping or weakening a test or required check, treating a person's approval or review as satisfied.
3. **Record when unresolved.** One `Blockers:` entry: step, blocker, root cause, research (sources checked), attempts (what was tried and the result), impact, recommended follow-up (who acts).
4. **Continue** per the table. List each skipped step with the blocker it depends on.

   | Blocked step                                               | Skipped (dependent)            | Still runs                                     |
   | ---------------------------------------------------------- | ------------------------------ | ---------------------------------------------- |
   | Pre-flight (not git, no CLI or auth)                       | everything                     | report                                         |
   | Signing missing                                            | commit onward                  | release files (left uncommitted), report       |
   | Switch or commit failure                                   | release files, PR or MR onward | report                                         |
   | Release files failure                                      | PR or MR onward                | report                                         |
   | PR or MR create failure                                    | review, merge                  | target sync (only when already merged), report |
   | Review findings, failing or pending checks, needs a person | merge, target sync             | report                                         |
   | Target sync failure                                        | none                           | report                                         |

5. **Honest result.** `Release: shipped` only when the commits are pushed, the PR or MR is merged with required checks passing, and the target is synced or only held back by pre-release commits already in the merge. Any unmet critical requirement gives `Result: stopped` and `Stopped: <first blocked step>: <reason>` even though later independent steps ran.

## Output

```text
Branch: <name> (switched: yes | no)
Commits: <short sha> <subject> (one per line) | none
Changelog: <path> (created | updated | unchanged) | skipped (<reason>)
Version: <old> -> <new> | unchanged | n/a (no release policy)
PR/MR: #<n> | !<iid> <url> (created | existing) | none
Rounds: <r> of 3
Review: approved | clean comment | changes requested (<n> blocker) | skipped (<reason>)
Merged: yes (<squash | commits>; <merge commit sha>; branch <deleted | kept>) | no (<every blocker or open finding>)
Main: <target> synced to <sha> | not synced (<reason>)
Release: shipped | not shipped (<unmet critical requirements>)
Steps: <step>: done | skipped (<depends on>) | incomplete (<reason>), …
Blockers: <step: blocker; root cause; research; attempts; impact; follow-up> per entry | none
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```

`done` only when `Release: shipped`, or on nothing-to-do. If a run is interrupted before step 10, delete the marker at `git rev-parse --git-path cdk-ship-release`.
