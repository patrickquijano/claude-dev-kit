# GitHub feedback commands

Used by `cdk:address-pull-request-review`. Pre-flight and command text rules: `${CLAUDE_SKILL_DIR}/../prepare-pull-request/github.md` (`## Pre-flight`, `## Command rules`). Item and state rules: `${CLAUDE_SKILL_DIR}/state.md`.

GraphQL and REST calls stay out of `allowed-tools` (a GraphQL call may be a mutation), so each is permission-prompted. Reads and writes use scratch files for any model-written text: `-F body=@<file>` or `--input <file>`.

## Candidate PRs

- `gh pr list --state open --limit 50 --json number,title,author,headRefName,baseRefName,isDraft,headRepositoryOwner,reviewDecision,updatedAt`.
- Keep only Repo-owner heads, authored by Self. Save each result under Scratch and pass the paths to the collector.
- Per PR (cap the check at the 10 most recently updated), run the threads query below and `gh pr view <n> --json latestReviews,reviewRequests,author`.
- Keep a PR when any of these holds: an unresolved, non-outdated thread whose last comment is not by the PR author; a reviewer question (comment ending `?` or a review body asking one) with no later reply by the author; a latest effective review of `CHANGES_REQUESTED`.
- Only PRs authored by Self are offered; a typed number must be one of them. Print number, title, head → base, and the reason each qualified.

## Gather

- Details: `gh pr view <n> --json number,url,title,body,author,baseRefName,baseRefOid,headRefName,headRefOid,headRepositoryOwner,isCrossRepository,state,isDraft,files,commits,reviews,latestReviews,reviewRequests,comments`.
- Threads, paginated until `hasNextPage` is false:

  ```graphql
  query ($o: String!, $r: String!, $n: Int!, $c: String) {
    repository(owner: $o, name: $r) {
      pullRequest(number: $n) {
        id
        reviewThreads(first: 50, after: $c) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            id
            isResolved
            isOutdated
            viewerCanResolve
            viewerCanReply
            path
            line
            originalLine
            startLine
            diffSide
            comments(first: 50) {
              pageInfo {
                hasNextPage
              }
              nodes {
                id
                databaseId
                url
                createdAt
                body
                author {
                  login
                  __typename
                }
                pullRequestReview {
                  databaseId
                  state
                }
              }
            }
          }
        }
      }
    }
  }
  ```

  Run with `gh api graphql -F query=@<file> -f o=<owner> -f r=<repo> -F n=<n> [-f c=<cursor>]` (`-F` reads the file; `-f` would send the literal text). A thread whose `comments.pageInfo.hasNextPage` is true → note the truncation in the Output.

- General PR comments come from `comments` in the details; review summaries from `reviews` (`id`, `author`, `state`, `body`, `submittedAt`, `commit.oid`). A review with an empty body and no thread comments is not an item.
- Save each result to `<scratch>/` as JSON and pass paths, never contents, to agents.

## Re-fetch before a mutation

Re-run `gh pr view <n> --json state,headRefOid,reviewRequests,latestReviews,isDraft` and the threads query. Require: `state` `OPEN`; `headRefOid` equals the expected SHA (`pushedSha` after a push, else the SHA recorded at fetch); the target thread still exists and its resolved flag is as recorded. Mismatch → stop that operation and report the field. Retry a stale head at most 3 times, 5 s apart (GitHub may lag after a push).

## Mutations

Orchestrator only, after the Gate B approval and the re-fetch, one item at a time, each recorded in `ops[]` straight after success:

- Thread reply: mutation file `mutation($t:ID!,$b:String!){addPullRequestReviewThreadReply(input:{pullRequestReviewThreadId:$t,body:$b}){comment{id databaseId url}}}`; `gh api graphql -F query=@<file> -f t=<thread node id> -F b=@<scratch>/reply.md`; record `comment.id` as `replyId`. The input also accepts an optional `pullRequestReviewId`; omit it so the reply posts immediately rather than into a pending review.
- General comment (reply to a PR comment or review summary, which have no thread): `gh api repos/<owner>/<repo>/issues/<n>/comments -X POST -F body=@<scratch>/reply.md` (record the returned `id` as `replyId`); open the body with a quote of the first line of the item (`> <text>`) and its link so the target is clear.
- Resolve: mutation file `mutation($t:ID!){resolveReviewThread(input:{threadId:$t}){thread{id isResolved}}}`; `gh api graphql -F query=@<file> -f t=<thread node id>`; only per the state.md resolve rule.
- Re-request review: `gh api repos/<owner>/<repo>/pulls/<n>/requested_reviewers -X POST -F 'reviewers[]=<login>'` per target (the REST endpoint adds reviewers; the GraphQL `requestReviews` mutation replaces the list unless `union` is true, so it is not used). `403` or `422` (not a collaborator or no write access) → report the exact error, skip that reviewer, continue.
- Never call: merge, approve, dismiss, delete or minimize comment, `unresolveReviewThread`, branch protection, or any `gh pr` write.

## Verify after mutations

Re-read threads and comments: each posted reply is present once (marker match); each resolved thread has `isResolved` true; `reviewRequests` lists each re-requested login. Mismatch → report the field; do not retry a reply, only re-check.
