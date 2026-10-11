---
description: Ship the current changes as a GitHub release end to end. Switch off a protected branch, commit, bump the SemVer version and release notes, validate, open a pull request to main, loop self-review and fix rounds (up to 5), squash-merge a clean PR, sync main, and offer a confirmed branch cleanup. Use only when the user explicitly asks to ship, cut, or publish a release through a pull request.
argument-hint: ''
allowed-tools: Bash(git rev-parse *) Bash(git status *) Bash(git remote get-url *) Bash(git fetch --prune origin) Bash(git for-each-ref *) Bash(git rev-list *) Bash(git worktree list *) Bash(git symbolic-ref *) Bash(node *release-check.mjs *) Bash(gh auth status) Bash(gh repo view *) Bash(gh pr list *) Bash(gh pr view *) Bash(gh pr checks *) Bash(gh api repos/{owner}/{repo}/branches/{branch} --jq .protected)
---

# Ship Release

## Rules

- Orchestration per `${CLAUDE_PLUGIN_ROOT}/skills/build-skill/orchestration.md`; the command runs in the main thread and chains skills via the Skill tool.
- GitHub only, target `main`: `.claude/release-policy.json` `defaultBranch` must be `main`, else stop.
- Invoking this command is the consent for pushing, creating or updating the PR, posting reviews and replies, and merging a clean PR (not draft, conflict-free, required checks passing, never `--admin`). Branch deletion always needs its own explicit confirmation.
- Never force-push, `--admin`, `--no-verify`, `git reset --hard`, or delete `main`.
- Every step is idempotent and resumes from the observed state (branch, PR, version, merge state), so re-running continues instead of repeating.
- Caps: 5 review rounds, a 30-minute required-checks wait, 3 validation re-runs; a cap hit ends `done` with the open items listed.
- Small, low-risk changes are reviewed directly by the chained review skills; subagents run only where a chained skill uses them.
- AskUserQuestion unavailable: follow `${CLAUDE_PLUGIN_ROOT}/skills/build-skill/fallbacks.md` (the branch cleanup then defaults to Keep all).
- Final step: follow `${CLAUDE_PLUGIN_ROOT}/skills/build-skill/resolve-findings.md` (scope: ask-only; sources: `Merged: no (<reasons>)`, failed validation, open `Resolution:` lines of the chained skills).
- Known issues: follow `${CLAUDE_PLUGIN_ROOT}/skills/build-skill/known-issues.md` with slug `ship-release`.

## Workflow

1. **Pre-flight.** Repo root = `git rev-parse --show-toplevel`. No merge, rebase, or detached HEAD in progress (same states `hooks/scripts/git-state.mjs` treats as unsafe). `git remote get-url origin` host is `github.com`. `gh auth status` ok. `.claude/release-policy.json` present with `defaultBranch` `main`. Any failure → stop.
2. **Resume detection.** `git fetch --prune origin`. Current = `git rev-parse --abbrev-ref HEAD`; its PR = `gh pr list --head <current> --state all --json number,state,url`.
   - PR merged → step 9.
   - On `main`, clean, and `git rev-list --count origin/main..HEAD` = 0 → "nothing to release", step 9.
   - On `main` or another protected branch (per `${CLAUDE_PLUGIN_ROOT}/skills/commit-changes/conventions.md` `## Protected branch`) with changes → invoke `cdk:switch-branch`.
3. **Commit.** Dirty tree → invoke `cdk:commit-changes` (it pushes).
4. **Version and notes.** `node ${CLAUDE_PLUGIN_ROOT}/hooks/scripts/release-check.mjs check --target main --json`. A `version-*` failure → invoke `cdk:bump-version target main` (it chains `cdk:write-changelog`). With a changelog, invoke `cdk:write-changelog release <required> <today> base main`. The release changes documented behavior, setup, config, usage, or examples (compare the diff with README sections) → invoke `cdk:write-readme`. Then `cdk:commit-changes`; re-check until `ok`.
5. **Validate.** Spawn `cdk:pr-feedback-validator` for the repo's documented lint, test, and build checks in check mode. A failure → stop with the failing command (no PR on red); at most 3 re-runs after fixes.
6. **PR.** No open PR → invoke `cdk:prepare-pull-request --target main --yes`. An open PR → keep its number; pushes update it.
7. **Review loop** (up to 5 rounds):
   1. Invoke `cdk:review-pull-request <n> --auto --squash yes --delete-branch yes`. It posts the review and merges only a clean PR with required checks passing.
   2. `Merged: yes` → step 9.
   3. Findings → invoke `cdk:address-pull-request-review <n> self-review --yes`. Fixes that affect release notes → re-run step 4, then step 5, then the next round.
   4. No findings, required checks pending → `gh pr checks <n> --required --watch` (30-minute cap), then the next round.
   5. A blocker that needs a person (required approval, conflicts, draft, branch policy) → stop and report it.
8. **Merge verify.** `gh pr view <n> --json state,mergeCommit` → `MERGED`; else report the state.
9. **Sync main.** `git switch main`, `git fetch --prune origin`, `git merge --ff-only origin/main`. A dirty tree or a non-fast-forward stops the command; never reset.
10. **Branch plan.** Candidates = every local `refs/heads/*` and `refs/remotes/origin/*`, excluding `main` and the default branch, protected branches (`gh api repos/{owner}/{repo}/branches/<b> --jq .protected`, plus the `rules/branches/<b>` ruleset check), heads of open PRs (`gh pr list --state open --json headRefName`), and branches checked out in another worktree (`git worktree list --porcelain`). Show a table: branch, local or remote, unmerged into `main` yes or no. None → skip to step 12. Else one AskUserQuestion: `Delete N local + M remote` | `Keep all` (Recommended).
11. **Delete.** Only on the explicit delete answer: per branch re-check every exclusion right before deleting, then `git branch -D <b>` and `git push origin --delete <b>` (no force), then `git fetch --prune origin`.
12. **Resolve findings.** Per resolve-findings.md, then print the Output.

## Output

```text
Branch: <name> (switched: yes | no)
Version: <old> -> <new> | unchanged
PR: #<n> <url> (created | existing) | none
Rounds: <r> of 5
Merged: yes (squash; <merge commit sha>) | no (<every blocker or open finding>)
Main: synced to <sha> | not synced (<reason>)
Cleanup: deleted <n> local + <m> remote | kept all | nothing to delete
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```

`done` includes a review loop that exits with findings or blockers left open (listed under `Merged: no`); `stopped` is a step failure or a stop above.
