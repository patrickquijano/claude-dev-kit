---
name: ship-release
description: Ship the current changes through a GitHub pull request or GitLab merge request end to end. Switch off a protected branch, make atomic signed commits, update the version, changelog, and README, create or update the PR or MR, review it with labeled inline comments, address open items and re-review (up to 3 rounds), merge when clean (squash and branch deletion asked once), sync the target branch, and summarize. Continues past blockers and reports them. Use only when the user explicitly asks to ship, cut, or publish a release or change through a pull request or merge request, e.g. "ship this", "ship a release", "commit, open a PR, review, and merge".
argument-hint: '[--target <branch>]'
allowed-tools: Bash(git --version) Bash(node --version) Bash(npx --version) Bash(gh --version) Bash(glab --version) Bash(git rev-parse *) Bash(git status *) Bash(git remote get-url *) Bash(git fetch --prune origin) Bash(git for-each-ref *) Bash(git rev-list *) Bash(git symbolic-ref --short refs/remotes/origin/HEAD) Bash(git log *) Bash(git diff *) Bash(node *release-check.mjs *) Bash(rm -f -- *cdk-ship-release) Bash(gh auth status) Bash(glab auth status) Bash(gh pr list *) Bash(gh pr view *) Bash(gh pr checks *) Bash(glab mr list *) Bash(gh api repos/{owner}/{repo}/branches/{branch} --jq .protected)
---

# Ship Release

Input: $ARGUMENTS

## Rules

- Orchestration per `${CLAUDE_SKILL_DIR}/../build-skill/orchestration.md`; this skill runs in the main thread, chains skills via the Skill tool, and repeats none of their git, `gh`, or `glab` work.
- Host from `git remote get-url origin`: `github.com` → GitHub PR flow (`gh`); any other host → GitLab MR flow (`glab`).
- Invoking this skill is the consent for atomic signed commits, normal pushes, creating or updating the PR or MR, posting reviews and replies, and merging a clean PR or MR (not draft, conflict-free, required checks passing, never `--admin`). Squash and source-branch deletion are asked once (step 6).
- Never force-push, `--admin`, `--no-verify`, `git reset --hard`, or delete `main`. Never bypass a hook, check, or required review.
- Every step is idempotent and resumes from the observed state (branch, commits, PR or MR, version, merge state), so a re-run continues instead of repeating.
- Caps: 3 review-address-re-review rounds, 2 check waits of 30 minutes each, 2 blocker attempts per blocker; a cap hit stops that step and follows `## Blockers`.
- Own PR or MR: GitHub rejects a self `APPROVE` or `REQUEST_CHANGES`, so the review is posted as `COMMENT` and a clean verdict (no `blocker:` comment) with passing required checks counts as approval; any `blocker:` comment counts as changes requested. GitLab approves for real when the project allows author approval, else the same rule.
- Reviewer severities appear in posted comments as labels: `blocker:` (critical, high), `suggestion:` (medium, low), `question:`, `nit:`.
- AskUserQuestion unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/fallbacks.md` (squash and delete default to the recommended options).
- Final step: follow `${CLAUDE_SKILL_DIR}/../build-skill/resolve-findings.md` (scope: ask-only; sources: `Blockers:` entries, `Release: not shipped`, `Steps: … incomplete`, `Main: not synced`, `Merged: no (<reasons>)`, open `Resolution:` lines of the chained skills).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `ship-release`.

## Workflow

1. **Pre-flight.** `git`, `node`, `npx` present (`--version`), plus `gh` (GitHub) or `glab` (GitLab). Repo root = `git rev-parse --show-toplevel`. No merge, rebase, or detached HEAD in progress (the states `hooks/scripts/git-state.mjs` treats as unsafe). Auth ok (`gh auth status` or `glab auth status`). Signing set per `${CLAUDE_SKILL_DIR}/../commit-changes/conventions.md` `## Signing` (missing → blocker `signing`, not a stop). Target = `--target`, else `.claude/release-policy.json` `defaultBranch`, else `git symbolic-ref --short refs/remotes/origin/HEAD` without `origin/`. `git fetch --prune origin`. Write the hold marker at the absolute path `git rev-parse --path-format=absolute --git-path cdk-ship-release` with the Write tool; the plugin's commit Stop hook skips this tree until step 9 deletes it (`rm -f -- <that path>`). Any other failure → blocker; a pre-flight stop prints `Resolution: not run (stopped)`.
2. **Resume detection.** Current = `git rev-parse --abbrev-ref HEAD`; its PR or MR = the open one (`gh pr list --head <current> --state all --json number,state,url,headRefOid`, or `glab mr list --source-branch <current> -F json`), else the latest.
   - Merged and its head equals `HEAD` (or `origin/<target>..HEAD` is empty) → step 9.
   - On the target, clean, and `git rev-list --count origin/<target>..HEAD` = 0 → "nothing to ship", `Result: nothing-to-do`, step 9.
   - Open PR or MR with a clean tree and nothing unpushed → step 6.
3. **Branch.** On the target or a protected branch (per `conventions.md` `## Protected branch`) with changes (dirty tree, or `git rev-list --count origin/<target>..HEAD` > 0) → invoke `cdk:switch-branch`; step 9 then reconciles local `<target>`.
4. **Commit.** Dirty tree → invoke `cdk:commit-changes` (atomic, signed, pushed). A clean tree with unpushed commits needs no step here; step 7 pushes them.
5. **Release files.** `.claude/release-policy.json` present → invoke `cdk:bump-version target <target>` (it chains `cdk:write-changelog`); else invoke `cdk:write-changelog base <target>` (creates `CHANGELOG.md` when missing). The shipped change alters documented behavior, setup, config, usage, or examples (compare `git diff origin/<target>...HEAD` with the README sections) → invoke `cdk:write-readme`. Dirty tree → invoke `cdk:commit-changes`. Each skill is idempotent, so this step also runs after every fix round (step 8).
6. **Merge options.** One AskUserQuestion with two questions: Squash (`Squash into one commit` Recommended | `Keep commits`) and Delete source branch (`Delete branch` Recommended | `Keep branch`). Asked once per run, before the first review; the answers go to every later step.
7. **PR or MR.** GitHub: invoke `cdk:prepare-pull-request --target <target> --yes`. GitLab: invoke `cdk:prepare-merge-request target=<target> squash=<yes|no> delete-source=<yes|no> auto`. Each fills the repository template (or its bundled one), sets the title, and assigns self; an existing PR or MR is updated. Keep the number or iid. `stopped` → blocker `PR/MR create`.
8. **Review loop** (up to 3 rounds). Skip the review when the PR or MR is already approved and clean.
   1. **Review.** GitHub: invoke `cdk:review-pull-request <n> --auto --squash <yes|no> --delete-branch <yes|no>`. GitLab: invoke `cdk:review-merge-request <iid> auto`. Each posts one review with labeled inline comments and merges a clean PR or MR; read `Merged:` from its Output.
   2. **Merged** → step 9.
   3. **Pending required checks** → GitHub `gh pr checks <n> --required --watch` (30-minute cap), GitLab re-read `head_pipeline` until it finishes (30-minute cap), at most 2 waits, then repeat the review.
   4. **Blockers or open items** (a `blocker:` comment, failing checks, or other open findings) → GitHub: invoke `cdk:address-pull-request-review <n> self-review --yes`. GitLab: invoke `cdk:address-merge-request-review <iid> auto`. Then run step 5 again, and start the next round at 8.1. An item that needs a person (required approval from someone else, conflicts, draft, branch policy) → record it as a blocker and leave the loop.
   5. Cap hit with items left → blocker `review rounds`, leave the loop.
9. **Sync target.** `git switch <target>`, `git fetch --prune origin`, `git merge --ff-only origin/<target>`. A dirty tree is a blocker. A non-fast-forward is allowed only when every extra local `<target>` commit is in the merged PR or MR (`git cherry origin/<target> <target>` shows none unmerged by patch); report it as `not synced (local <target> has pre-release commits)`. Never reset. Delete the marker (`rm -f -- <absolute marker path>`), on every path out of the run, including a stop.
10. **Resolve findings.** Per resolve-findings.md; record a fix in auto memory per known-issues.md only when the issue recurs.
11. **Output.**

## Blockers

Applies to every step; blockers are reported, never asked. A blocked step does not end the run: run every step that does not depend on it and is still safe.

1. **Investigate.** In order: the failing command's exact output; auto memory per known-issues.md (slug `ship-release`), the repo's `CLAUDE.md` `Known issues`, and `.claude/rules/`; CI logs (`gh run list --branch <b>` then `gh run view <id> --log-failed`, or `glab ci` job logs); the chained skill's `Stopped:`, `Blocked:`, and `Resolution:` lines; for an external tool or host error, the official docs via `cdk:topic-researcher` (cited sources). Write down the root cause, or `unknown` with what was ruled out.
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

5. **Honest result.** `Release: shipped` only when the commits are pushed, the PR or MR is merged with required checks passing, and the target is synced. Any unmet critical requirement gives `Result: stopped` and `Stopped: <first blocked step>: <reason>` even though later independent steps ran.

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

`done` only when `Release: shipped`, or on nothing-to-do. A stop leaves the marker in place only before step 9; delete it with `git rev-parse --git-path cdk-ship-release` if a run was interrupted.
