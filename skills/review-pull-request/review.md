# GitHub PR review conventions

Used by `cdk:review-pull-request`. Pre-flight, remote parsing, and command-text rules: `${CLAUDE_SKILL_DIR}/../prepare-pull-request/github.md` (`## Pre-flight`, `## Command rules`).

## Select PR

- Fields (all `gh pr list --json`): `number,title,author,headRefName,baseRefName,isDraft,headRepositoryOwner,headRefOid,statusCheckRollup,reviewDecision,changedFiles,additions,deletions`.
- Current-branch match: `gh pr list --head <branch> --state open --json <fields>`, then keep entries whose `headRepositoryOwner.login` equals Repo's owner (`--head` takes a bare branch name, so a fork's same-named branch also appears). Exactly one → select it.
- Otherwise `gh pr list --state open --limit 50 --json <fields>`; numbered table sorted by most recent first.
- Checks column: all `statusCheckRollup` entries pass → `pass`; any failing → `fail`; any pending → `pending`; empty → `none`.
- Never select a PR that is not in the printed list; a typed number must be in it.

## Gather

- Details: `gh pr view <n> --json number,url,title,body,author,baseRefName,baseRefOid,headRefName,headRefOid,commits,files,reviews,latestReviews,reviewDecision,isDraft,mergeStateStatus,isCrossRepository`.
- Diff: `gh pr diff <n>` → `<scratch>/diff.patch`; changed files with status from `files` and `gh pr diff <n> --name-only` → `<scratch>/name-status.txt`; commits from `commits` → `<scratch>/log.txt`. `gh pr diff` failing (GitHub caps very large diffs) → stop; `files` or `commits` returning 100 entries → the list may be truncated: take names from `gh pr diff <n> --name-only`, take the log from `git log <mb>..<headRefOid>`, and note it.
- Checks: `gh pr checks <n> --json name,state,bucket,link,workflow`; `bucket` is `pass | fail | pending | skipping | cancel`. `gh pr checks` exits non-zero for failing or pending checks too, so parse the JSON whatever the exit code; `no checks reported` → none.
- Unresolved threads: `gh api graphql -f query='query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){pullRequest(number:$n){reviewThreads(first:100){nodes{isResolved isOutdated path line comments(first:5){nodes{author{login} body}}}}}}}' -f o=<owner> -f r=<repo> -F n=<n>`. It is a read query; the call stays out of `allowed-tools` (a GraphQL call could be a mutation), so it is permission-prompted. More than 100 threads → note the truncation.
- Local objects: `git cat-file -e <headRefOid>^{commit}` fails → `git fetch <remote> pull/<n>/head` (remote = the one whose URL matches Repo). Base likewise (`baseRefOid`). Fetch only; never check out or merge.
- Merge base: `git merge-base <baseRefOid> <headRefOid>`; none → stop.
- Fork PRs (`isCrossRepository`) are reviewable read-only through `pull/<n>/head`; note it.

## Local checks

Run only when `git rev-parse HEAD` equals `headRefOid` and `git status --porcelain` is empty. Otherwise pass `checks: skip <reason>` to `cdk:pr-test-reviewer`: the working tree would not be the code under review, and a checkout would modify the user's tree.

## Inline placement

- A finding is inline-able when `file` is in the diff and `line` falls inside a hunk on the new (right) side of `diff.patch`. Payload entry: `{"path":…,"line":<n>,"side":"RIGHT","body":…}`; a range adds `start_line` and `start_side`.
- Anything else (no line, deleted file, collapsed diff, line outside a hunk) → summary-only.
- Comment body: `**<severity>** (<blocking | non-blocking>): <summary>`, then `Evidence:`, `Impact:`, `Fix:` lines. Plain English, full sentences.

## Verdict

1. Draft PR → `COMMENT`.
2. Any verified blocking finding (`blocking: yes`, `status: confirmed`) → `REQUEST_CHANGES`.
3. `APPROVE` only when every item holds: no verified blocking finding; every CI check `pass` (or `skipping`); local checks ran and exited 0, or the repository documents none; test reviewer `Status: pass` with no `Limitations` naming a skipped required check; no unresolved thread whose last comment asks for a change; no reviewer `incomplete` other than docs.
4. Everything else → `COMMENT`, with the reason (pending checks, skipped validation, incomplete reviewer) in the summary.
5. Author equals Self → `COMMENT` only. GitHub's docs do not state the own-PR restriction, so the skill avoids the call rather than relying on an error.
6. Never override branch protection or repository policy; the review state is advisory input to them.

## Review payload

- File `<scratch>/review.json`: `{"commit_id":"<headRefOid>","event":"<COMMENT|REQUEST_CHANGES|APPROVE>","body":<summary>,"comments":[…]}`. `body` is required for `COMMENT` and `REQUEST_CHANGES`; `commit_id` pins the reviewed commit.
- Post: `gh api repos/<owner>/<repo>/pulls/<n>/reviews -X POST --input <scratch>/review.json`. One call, so the review lands whole or not at all (an invalid inline position returns `422` and nothing posts).
- `422` on a comment position → move that comment to the summary and retry once; any other error → report the exact error line, stop.
- Summary body: verdict line, per-role status, counts and `Summary` sentence, validation performed with exit codes, blocking findings, then suggestions, then limitations. No attribution.
