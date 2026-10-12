# GitHub review conventions

Host section of `cdk:review-change-request` (host = `origin` on `github.com`); the GitLab counterpart is `gitlab.md`. Pre-flight: `${CLAUDE_SKILL_DIR}/../prepare-change-request/github.md` `## Pre-flight`. Host-neutral rules: `review.md`. A change request is a pull request; `<n>` is its number.

## Review pre-flight

Skip the shared detached-HEAD stop (a remote PR needs no branch; `HEAD` just means no branch match).

- `gh repo view --json viewerPermission`: error → stop; keep the value (`NONE`, `READ`, `TRIAGE`, `WRITE`, `MAINTAIN`, `ADMIN`) for `## Merge`.
- `gh repo view --json squashMergeAllowed,mergeCommitAllowed,rebaseMergeAllowed,deleteBranchOnMerge`; keep them for `## Merge`.
- A `403`, or a `422` that is not a comment-position error, at publish stops there with its exact error (GitHub's docs do not say which permission each review event needs).

## Select

- Fields (all `gh pr list --json`): `number,title,author,headRefName,baseRefName,isDraft,headRepositoryOwner,headRefOid,statusCheckRollup,reviewDecision,changedFiles,additions,deletions`.
- Current-branch match: `gh pr list --head <branch> --state open --json <fields>`, then keep entries whose `headRepositoryOwner.login` equals Repo's owner (`--head` takes a bare branch name, so a fork's same-named branch also appears). Exactly one → select it.
- Otherwise `gh pr list --state open --limit 50 --json <fields>`; numbered table sorted by most recent first.
- Checks column: all `statusCheckRollup` entries pass → `pass`; any failing → `fail`; any pending → `pending`; empty → `none`.
- A number argument → `gh pr view <n> --json state,url` must show `OPEN`.
- Never select a PR that is not in the printed list; a typed number must be in it.

## Gather

- Details: `gh pr view <n> --json number,url,title,body,author,baseRefName,baseRefOid,headRefName,headRefOid,commits,files,reviews,comments,latestReviews,reviewDecision,isDraft,mergeStateStatus,isCrossRepository`. `reviews` and `comments` (review bodies, PR conversation) feed `## Prior discussion`. Keep: head = `headRefOid`, base = `baseRefOid`, author login, draft flag.
- Diff: `gh pr diff <n>` → `<scratch>/diff.patch`; changed files with status from `files` and `gh pr diff <n> --name-only` → `<scratch>/name-status.txt`; commits from `commits` → `<scratch>/log.txt`. `gh pr diff` failing (GitHub caps very large diffs) → stop; `files` or `commits` returning 100 entries → the list may be truncated: take names from `gh pr diff <n> --name-only`, take the log from `git log <mb>..<headRefOid>`, and note it.
- Checks: `gh pr checks <n> --json name,state,bucket,link,workflow`; `bucket` is `pass | fail | pending | skipping | cancel`. `gh pr checks` exits non-zero for failing or pending checks too, so parse the JSON whatever the exit code; `no checks reported` → none.
- Review threads, resolved and unresolved: `gh api graphql -f query='query($o:String!,$r:String!,$n:Int!){repository(owner:$o,name:$r){pullRequest(number:$n){reviewThreads(first:100){nodes{id isResolved isOutdated viewerCanResolve path line comments(first:5){nodes{author{login} body url createdAt}}}}}}}' -f o=<owner> -f r=<repo> -F n=<n>`. It is a read query; the call stays out of `allowed-tools` (a GraphQL call could be a mutation), so it is permission-prompted. More than 100 threads → note the truncation. Own threads = `isResolved` false, `viewerCanResolve` true, first comment author = Self.
- Local objects: `git cat-file -e <headRefOid>^{commit}` fails → `git fetch <remote> pull/<n>/head` (remote = the one whose URL matches Repo). Base likewise (`baseRefOid`). Fetch only; never check out or merge.
- Merge base: `git merge-base <baseRefOid> <headRefOid>`; none → stop.
- Fork PRs (`isCrossRepository`) are reviewable read-only through `pull/<n>/head`; note it.

## Criteria

- A4: every `gh pr checks` bucket is `pass` or `skipping` → pass; any `fail`, `cancel`, or `pending` → fail ("checks not finished; re-run the review after they finish" for pending); none configured → pass with note "no checks".
- A7: `reviewDecision` `APPROVED` → pass; `REVIEW_REQUIRED` → pass only when another author's approval by Self would satisfy it (author is not Self) and no other reviewer's latest review is `CHANGES_REQUESTED`; otherwise fail, naming the pending requirement. `reviewDecision` null (no required reviews) → pass.

## Positions

Inline comment entry: `{"path":…,"line":<n>,"side":"RIGHT","body":…}`; a range adds `start_line` and `start_side`. A `new` or `both` finding uses `RIGHT`; an `old` finding uses `LEFT` with the old line. Suggestions: a plain fenced `suggestion` block (no `:-N+M`), on a single line or a contiguous range of the RIGHT side.

## Publish

- Re-fetch `gh pr view <n> --json headRefOid,state`; head changed → "new commits pushed", not `OPEN` → the state; both stop.
- Event: the verdict (`REQUEST_CHANGES`, `COMMENT`, or `APPROVE` per `## Approve`).
- File `<scratch>/review.json`: `{"commit_id":"<headRefOid>","event":"<EVENT>","body":<summary>,"comments":[…]}`. `body` is required for `COMMENT` and `REQUEST_CHANGES`; `commit_id` pins the reviewed commit. General non-praise findings go in `body` by subject (GitHub review payloads have no positionless threads).
- Post: `gh api repos/<owner>/<repo>/pulls/<n>/reviews -X POST --input <scratch>/review.json`. One call, so the review lands whole or not at all (an invalid inline position returns `422` and nothing posts).
- `422` on a comment position → move that comment to the summary and retry once; any other error → report the exact error line, stop.
- Own threads, after the review posted and verified: per kept thread write the reply text to `<scratch>/reply-<k>.md`, then `gh api graphql -f query='mutation($t:ID!,$b:String!){addPullRequestReviewThreadReply(input:{pullRequestReviewThreadId:$t,body:$b}){comment{url}}}' -f t=<thread id> -F b=@<scratch>/reply-<k>.md`, then `gh api graphql -f query='mutation($t:ID!){resolveReviewThread(input:{threadId:$t}){thread{isResolved}}}' -f t=<thread id>`. Only threads Self started; a failing thread is reported and left open, never retried.

## Verify

`gh pr view <n> --json latestReviews,reviews`: Self's newest review has the posted state (`COMMENT`→`COMMENTED`, `REQUEST_CHANGES`→`CHANGES_REQUESTED`, `APPROVE`→`APPROVED`) and `commit.oid` equals the reviewed `headRefOid`. After the thread mutations, re-run the threads query: each kept thread has `isResolved` true. Mismatch → report the field.

## Approve

Approval is the `APPROVE` review event, set only when A1–A7 pass, the user picks it (or `--yes`), and the PR author is not Self. Own PR → event `COMMENT` only; GitHub's docs do not state the own-PR restriction, so the skill avoids the call rather than relying on an error. A PR Self already approved (latest review `APPROVED`) → skip.

## Merge

- `--yes` never uses the admin case; every other rule below stays. Offered at step 9 only when every item holds: the `review.md` `## Verdict` merge items; `mergeStateStatus` is `CLEAN` or `HAS_HOOKS`, or, on another author's PR, `BLOCKED` with `reviewDecision` `REVIEW_REQUIRED` (this skill's `APPROVE` may satisfy it; step 12 re-checks). Admin case: the author is Self, `viewerPermission` is `ADMIN`, and `mergeStateStatus` is `BLOCKED` with `reviewDecision` `REVIEW_REQUIRED` (Self cannot approve its own PR) → offered as an _admin_ merge (`ADMIN` is necessary, not sufficient: protection that includes administrators still refuses it, and the error path reports that); with any other `viewerPermission`, not offered, blocker `required review; --admin needs ADMIN (have <perm>)`. `UNKNOWN` → re-fetch up to 3 times, then not offered.
- Step 12 gate: another author's PR → the `APPROVE` review is posted and verified, else `Merged: no (approval not posted)`; then the re-fetch below must show `CLEAN` or `HAS_HOOKS`; an _admin_ merge may instead still show `BLOCKED` with `REVIEW_REQUIRED` (and drops `--admin` when it shows `CLEAN` or `HAS_HOOKS`).
- Options: from `## Review pre-flight`. Squash yes → `--squash`; no → `--merge`. One of those two allowed → use it, skip the Squash question, note it. Neither allowed → not offered (name `--rebase` as unsupported when `rebaseMergeAllowed`). Delete source branch skipped for fork PRs (`isCrossRepository`), whose branch the base repo cannot delete. Question defaults: Delete recommended = `deleteBranchOnMerge`; the question text warns that gh also deletes the local branch and switches off it when it is checked out. Admin merge label: `Merge PR #<n> now (--admin, bypasses required review)`.
- Run: re-fetch `gh pr view <n> --json headRefOid,state,mergeStateStatus` and `gh pr checks <n> --json bucket`; head changed → "new commits pushed", stop; not `OPEN`, not `CLEAN`/`HAS_HOOKS` (an _admin_ merge also accepts `BLOCKED` with `REVIEW_REQUIRED`), or any check `fail` (an _admin_ merge also stops on `pending`; every bucket must be `pass` or `skipping`); `UNKNOWN` → re-fetch up to 3 times → report the field, stop. Then `gh pr merge <n> --squash|--merge [--delete-branch] [--admin] --match-head-commit <headRefOid>`. Pass `--admin` only for an _admin_ merge that still needs it; never pass `--auto`; `gh pr merge --help` says it enables auto-merge or the merge queue when required checks have not passed, which the gate avoids. With `--delete-branch`, gh deletes the local branch too and may switch off it; add `local branch deleted` to `Merged:` when the branch was checked out.
- Error → report the exact error line; any posted review stays; stop. Verify: `gh pr view <n> --json state,mergeCommit` shows `MERGED` with a `mergeCommit`; else report the field.

## API rules

- Reads: `gh pr list`, `gh pr view`, `gh pr diff`, `gh pr checks`, `gh repo view`, `gh api user` and the threads query only; none of the `gh api` calls is pre-approved.
- Writes (review POST, thread reply and resolve mutations, `gh pr merge`) stay out of `allowed-tools`, so each gets a permission prompt as a second confirmation.
- JSON request bodies go to a scratch file and `--input <file>`; text parameters use `-F name=@<file>`. Never inline user or model text in shell args.
