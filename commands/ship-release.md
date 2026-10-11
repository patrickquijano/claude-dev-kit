---
description: Ship the current changes as a GitHub release end to end. Switch off a protected branch, review and fix the uncommitted changes locally (up to 5 rounds, no commits), bump the SemVer version and release notes, validate, make one signed commit, open a pull request to main, verify and squash-merge a clean PR, sync main, and offer a confirmed branch cleanup. Continues past blockers and reports them. Use only when the user explicitly asks to ship, cut, or publish a release through a pull request.
argument-hint: ''
allowed-tools: Bash(git rev-parse *) Bash(git status *) Bash(git remote get-url *) Bash(git fetch --prune origin) Bash(git for-each-ref *) Bash(git rev-list *) Bash(git worktree list *) Bash(git diff *) Bash(git merge-base *) Bash(git log *) Bash(git symbolic-ref --short refs/remotes/origin/HEAD) Bash(node *release-check.mjs *) Bash(gh auth status) Bash(gh repo view *) Bash(gh pr list *) Bash(gh pr view *) Bash(gh pr checks *) Bash(gh run list *) Bash(gh run view *) Bash(gh api repos/{owner}/{repo}/branches/{branch} --jq .protected)
---

# Ship Release

## Rules

- Orchestration per `${CLAUDE_PLUGIN_ROOT}/skills/build-skill/orchestration.md`; the command runs in the main thread and chains skills via the Skill tool.
- GitHub only, target `main`: `.claude/release-policy.json` `defaultBranch` must be `main`, else stop.
- Invoking this command is the consent for pushing, creating or updating the PR, posting reviews and replies, and merging a clean PR (not draft, conflict-free, required checks passing, never `--admin`). Branch deletion always needs its own explicit confirmation.
- Never force-push, `--admin`, `--no-verify`, `git reset --hard`, or delete `main`.
- Every step is idempotent and resumes from the observed state (branch, PR, version, merge state), so re-running continues instead of repeating.
- One commit only (step 7), made after local review and validation pass; no commit during review or remediation. Abort leaves the tree uncommitted and keeps the hold marker.
- Caps: 5 local review rounds, 2 check waits of 30 minutes each, 3 validation re-runs, 2 version-and-notes re-check rounds, 2 blocker attempts per blocker, 2 post-commit fix cycles; a cap hit stops that step and follows `## Blockers`.
- Small changes are reviewed in this thread per `${CLAUDE_PLUGIN_ROOT}/skills/prepare-pull-request/findings.md` `## Direct review`; otherwise this command spawns the five `cdk:pr-*-reviewer` agents (head `WORKTREE`) and `cdk:pr-feedback-validator`.
- AskUserQuestion unavailable: follow `${CLAUDE_PLUGIN_ROOT}/skills/build-skill/fallbacks.md` (the branch cleanup then defaults to Keep all).
- Final step: follow `${CLAUDE_PLUGIN_ROOT}/skills/build-skill/resolve-findings.md` (scope: ask-only; sources: `Blockers:` entries, `Release: not shipped`, `Steps: … incomplete`, `Main: not synced`, `Merged: no (<reasons>)`, failed validation, open `Resolution:` lines of the chained skills).
- Known issues: follow `${CLAUDE_PLUGIN_ROOT}/skills/build-skill/known-issues.md` with slug `ship-release`.

## Workflow

1. **Pre-flight.** Repo root = `git rev-parse --show-toplevel`. No merge, rebase, or detached HEAD in progress (same states `hooks/scripts/git-state.mjs` treats as unsafe). `git remote get-url origin` host is `github.com`. `gh auth status` ok. `.claude/release-policy.json` present with `defaultBranch` `main`. Signing set per `${CLAUDE_PLUGIN_ROOT}/skills/commit-changes/conventions.md` `## Signing` (missing → blocker `signing`, not a stop). Any other failure → blocker; a pre-flight stop prints `Resolution: not run (stopped)`.
2. **Resume detection.** `git fetch --prune origin`. Current = `git rev-parse --abbrev-ref HEAD`; its PR = the open one from `gh pr list --head <current> --state all --json number,state,url,headRefOid`, else the latest.
   - PR merged and its `headRefOid` equals `HEAD` (or `origin/main..HEAD` is empty) → step 11; a merged PR with newer local commits is not this release, so continue.
   - On `main`, clean, and `git rev-list --count origin/main..HEAD` = 0 → "nothing to release", step 11.
   - Local commits not on the remote (`git rev-list --count @{u}..HEAD` > 0, or no upstream) and a clean tree → push as in step 7 (and delete the marker if present), then continue.
   - Open PR and a clean tree → step 9.
   - On `main` or another protected branch (per `${CLAUDE_PLUGIN_ROOT}/skills/commit-changes/conventions.md` `## Protected branch`) with changes (a dirty tree or `git rev-list --count origin/main..HEAD` > 0) → invoke `cdk:switch-branch`; step 11 then reconciles local `main`.
3. **Hold.** Write the marker `$(git rev-parse --git-path cdk-ship-release)` with the Write tool; the plugin's commit Stop hook then skips this tree until step 7 deletes it.
4. **Local review loop** (up to 5 rounds, no commits). Base = `git merge-base origin/main HEAD`. Write to scratch (`$CLAUDE_JOB_DIR/tmp` or the session scratchpad): `git diff <mb>` plus each untracked file via `git diff --no-index -- /dev/null <file>`, the name-status (`git diff --name-status <mb>` plus untracked as `A`), and `git log <mb>..HEAD`.
   1. Small change → review it here per `findings.md` `## Direct review`. Otherwise spawn the five `cdk:pr-*-reviewer` agents in one message with root, base ref `origin/main`, `<mb>`, head `WORKTREE`, the diff, name-status, and log scratch paths, and the findings contract path (the test reviewer may also get `checks: skip <reason>`).
   2. Validate output per `findings.md` `## Parent validation`. Gating = any `critical` or `high` finding, any `check-failed`, or an `incomplete` test reviewer whose limitation names a required check.
   3. Gating findings → fix them here (smallest change, only in files already in the diff), then spawn `cdk:pr-feedback-validator` with root, the changed paths from the name-status, and the repo's documented check commands (`CLAUDE.md`); `Required failing` non-empty = failed, `Not run` is reported as a gap. Fixed, or validation failed → next round. A clean round with validation passing → leave the loop and remember that round's name-status as the reviewed set.
   4. Cap hit, or a finding that needs a person → abort per `## Blockers`.
5. **Version and notes** (no commit). Draft the single subject now per `conventions.md` `## Commit subject` from the reviewer summaries and name-status; a breaking change gets `!`. Write it to `<scratch>/msg` and run commitlint on it (`npx commitlint --edit <scratch>/msg`). `node ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/release-check.mjs check --target main --pre-push --subject <scratch>/msg --json`. A `version-*` failure → invoke `cdk:bump-version target main subject <scratch>/msg` (it chains `cdk:write-changelog`). With a changelog, invoke `cdk:write-changelog release <required> <today> base origin/main`. The release changes documented behavior, setup, config, usage, or examples (compare the diff with README sections) → invoke `cdk:write-readme`. Re-check, at most 2 rounds; only `uncommitted` may remain, anything else is a blocker.
6. **Final validation.** Spawn `cdk:pr-feedback-validator` on the full tree (documented lint, test, and build checks in check mode). A failure → fix and re-run, at most 3 re-runs, then a blocker (no commit on red).
7. **Commit** (the only commit step). Intended = the last clean round's name-status ∪ the release files the policy owns (`versionFiles`, changelog) ∪ the README (if rewritten). Any path in `git status` outside Intended, or a secret-pattern hit (`commit-changes` `Secrets` rule), → abort. `pre` = `git rev-parse HEAD`. Staged = the Intended paths that appear in `git status` (reviewed paths already committed on the branch have no change to stage). `git add -A -- <Staged>`; `git diff --cached --name-only` must match Staged exactly. Staged empty (clean tree; only the version and notes were already committed) → no commit: skip to the push. `git commit -S -F <scratch>/msg`, then confirm `git log -1 --format=%G?` = `G`. Any failure before the commit exists → `git restore --staged -- <Staged>`, confirm HEAD = `pre`, keep working-tree edits, blocker. Then push (`git push origin HEAD:<branch>`, add `-u` per `commit-changes` step 10) and delete the marker. A push failure leaves the commit local and is a blocker.
8. **PR.** No open PR → invoke `cdk:prepare-pull-request --target main --yes` (its gate stops on findings → blocker). An open PR → keep its number; pushes update it.
9. **PR verification** (one pass, never commits). Invoke `cdk:review-pull-request <n> --auto --squash yes --delete-branch no`; the branch is deleted only in steps 12–13 after confirmation. It posts the review and merges only a clean PR with required checks passing.
   - `Merged: yes` → step 10.
   - Findings → `Merged: no (<findings>)`, blocker; never run `cdk:address-pull-request-review`, never commit. A fix for them is a post-commit cycle per `## Blockers`.
   - Required checks pending → `gh pr checks <n> --required --watch` (30-minute cap), then run this step again, at most 2 waits.
   - A blocker that needs a person (required approval, conflicts, draft, branch policy) → record it and go to step 12.
10. **Merge verify.** `gh pr view <n> --json state,mergeCommit` → `MERGED`; else record the state as a blocker and go to step 12 (stay on the release branch).
11. **Sync main.** `git switch main`, `git fetch --prune origin`, `git merge --ff-only origin/main`. A dirty tree is a blocker. A non-fast-forward is allowed only when every extra local `main` commit is in the merged PR (`git cherry origin/main main` shows none unmerged by patch); then report it as `not synced (local main has pre-release commits)` and go to step 12. Never reset.
12. **Branch plan.** Candidates = every local `refs/heads/*` and `refs/remotes/origin/*`, excluding `main`, the default branch, `origin/HEAD`, a branch name not matching `^[A-Za-z0-9._/-]+$` (listed as kept), protected branches (`gh api repos/{owner}/{repo}/branches/<b> --jq .protected`), heads of open PRs (`gh pr list --state open --json headRefName`), and branches checked out in another worktree (`git worktree list --porcelain`). Keep only branches that are merged: an ancestor of `origin/main` or a branch whose tip equals, or is an ancestor of, the `headRefOid` of a merged PR with the same `headRefName` (`gh pr list --state merged --json headRefName,headRefOid`); a branch that moved past it is unmerged; unmerged branches are listed as kept and never deleted. Show a table: branch, local or remote, reason (merged ancestor | merged PR). None → skip to step 14. Else one AskUserQuestion: `Delete N local + M remote` | `Keep all` (Recommended).
13. **Delete.** Only on the explicit delete answer: per branch re-check every exclusion and the tip-versus-`headRefOid` match right before deleting (a moved branch is kept), then `git branch -D -- '<b>'` (squash-merged branches are not ancestors, so `-d` would refuse) and `git push origin --delete -- '<b>'` (no force), then `git fetch --prune origin`. One delete failure is a blocker for that branch only.
14. **Resolve findings.** Per resolve-findings.md, then print the Output.

## Blockers

Applies to every step; blockers are reported, never asked. A blocked step does not end the run: run every step that does not depend on it and is still safe.

1. **Investigate.** In order: the failing command's exact output; auto memory per known-issues.md (slug `ship-release`), the repo's `CLAUDE.md` `Known issues`, and `.claude/rules/`; CI logs (`gh run list --branch <b>`, then `gh run view <id> --log-failed`); the chained skill's `Stopped:`, `Blocked:`, and `Resolution:` lines; for an external tool or GitHub error, the official docs via `cdk:topic-researcher` (cited sources). Write down the root cause, or `unknown` with what was ruled out.
2. **Resolve safely.** At most 2 attempts per blocker, each backed by evidence.
   - Allowed: re-run after a transient error, run a missing documented step, fix code or config in the working tree, re-run a chained skill with corrected input.
   - Never: `--no-verify`, `--admin`, force-push, `git reset --hard`, editing the release policy or a check to make it pass, skipping or weakening a test or required check, treating a person's approval or review as satisfied.
   - A code fix needed after the commit goes back through step 4 and then the single commit step 7; it is never committed mid-loop. At most 2 such post-commit cycles per run.
3. **Record when unresolved.** One `Blockers:` entry: step, blocker, root cause, research (sources checked), attempts (what was tried and the result), impact, recommended follow-up (who acts).
4. **Continue** per the table. List each skipped step with the blocker it depends on. The branch cleanup still needs its explicit confirmation.

   | Blocked step                                                     | Skipped (dependent)             | Still runs                                                                  |
   | ---------------------------------------------------------------- | ------------------------------- | --------------------------------------------------------------------------- |
   | Pre-flight (not git, not GitHub, no `gh` auth, no policy)        | everything                      | report                                                                      |
   | Signing missing                                                  | commit, push, PR, verify, merge | local review, validation, version and notes (left uncommitted), branch plan |
   | Local review cap or validation failure                           | commit onward                   | version and notes check (report only), branch plan and cleanup              |
   | Commit or push failure                                           | PR onward                       | branch plan and cleanup                                                     |
   | PR create failure                                                | verify, merge                   | branch plan and cleanup                                                     |
   | Verification findings, failing or pending checks, needs a person | merge, main sync                | branch plan and cleanup (the release branch is excluded as an open PR head) |
   | Main sync failure                                                | none                            | branch plan and cleanup                                                     |
   | One branch delete failure                                        | that branch                     | the other branches                                                          |

5. **Honest result.** `Release: shipped` only when the signed commit is pushed, the PR is merged with required checks passing, and main is synced. Any unmet critical requirement gives `Result: stopped` and `Stopped: <first blocked step>: <reason>` even though later independent steps ran.

## Output

```text
Branch: <name> (switched: yes | no)
Version: <old> -> <new> | unchanged
Commit: <sha> <subject> | none (aborted at <step>: <reason>)
PR: #<n> <url> (created | existing) | none
Rounds: <r> of 5 (local)
Merged: yes (squash; <merge commit sha>) | no (<every blocker or open finding>)
Main: synced to <sha> | not synced (<reason>)
Cleanup: deleted <n> local + <m> remote | kept all | nothing to delete
Release: shipped | not shipped (<unmet critical requirements>)
Steps: <step>: done | skipped (<depends on>) | incomplete (<reason>), …
Blockers: <step: blocker; root cause; research; attempts; impact; follow-up> per entry | none
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```

`done` only when `Release: shipped`, or on nothing-to-do. An abort leaves the tree uncommitted and the marker in place: re-run `/cdk:ship-release`, or delete the marker (`git rev-parse --git-path cdk-ship-release`).
