# GitHub feedback commands

Host section of `cdk:address-change-request-review` (host = `origin` on `github.com`); the GitLab counterpart is `gitlab.md`. Item and state rules: `${CLAUDE_SKILL_DIR}/references/state.md`. A change request is a pull request; `<n>` is its number.

## Contents

- Pre-flight · MCP tools · Find · Candidates · Branch · Gather · Re-fetch before a mutation · Mutations · Re-request · Verify after mutations

## Pre-flight

Run in order; any failure → report the exact error line and stop.

1. `inside-tree` prints `true`; Root = `toplevel`; Branch = `branch` (`HEAD` = detached → stop).
2. `git remote` lists a remote.
3. `gh auth status` succeeds, else tell the user to run `gh auth login`.
4. `gh repo view --json nameWithOwner,url,sshUrl` returns one repository; keep it as Repo. Fails → stop.
5. Self = `gh api user --jq .login`.
6. Scratch = `mktemp -d`.
7. `dirty-paths` non-empty → Dirty (see `flow.md`).

Reads are `gh pr list`, `gh pr view`, `gh repo view`, `gh api user`, `gh auth status` and the MCP read tools below (`get_me`, `list_pull_requests`, `pull_request_read`); every other call stays permission-prompted.

GraphQL and REST calls stay out of `allowed-tools` (a GraphQL call may be a mutation), so each is permission-prompted. Reads and writes use scratch files for any model-written text: `-F body=@<file>` or `--input <file>`.

## MCP tools

Call the MCP tool first; server not connected, error, or `—` → run the command unchanged. Writes keep their gates; no write MCP tool is in `allowed-tools`. Tool prefix: `mcp__plugin_github_github__`.

| Operation                                                           | MCP tool                                                               |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `gh auth status`                                                    | —                                                                      |
| `gh repo view`                                                      | —                                                                      |
| `gh api user`                                                       | `mcp__plugin_github_github__get_me`                                    |
| `gh pr list`                                                        | `mcp__plugin_github_github__list_pull_requests`                        |
| `gh pr view`                                                        | `mcp__plugin_github_github__pull_request_read`                         |
| `gh api graphql` threads query                                      | `mcp__plugin_github_github__pull_request_read` (`get_review_comments`) |
| `gh api graphql` thread reply (`addPullRequestReviewThreadReply`)   | `mcp__plugin_github_github__add_reply_to_pull_request_comment`         |
| `gh api repos/<owner>/<repo>/issues/<n>/comments -X POST`           | `mcp__plugin_github_github__add_issue_comment`                         |
| `gh api graphql` resolve (`resolveReviewThread`)                    | —                                                                      |
| `gh api repos/<owner>/<repo>/pulls/<n>/requested_reviewers -X POST` | —                                                                      |

## Find

- Number argument → `gh pr view <n> --json number,url,state,headRefName,baseRefName,headRepositoryOwner,author,isCrossRepository,headRefOid`; must be `OPEN`. Author not Self → the skill's co-author ask.
- Else `gh pr list --head <Branch> --state open --json number,url,author,headRefName,baseRefName,headRepositoryOwner,isCrossRepository,headRefOid`, keep Repo-owner heads authored by Self; exactly one → use it.
- Else candidates per `## Candidates`.

## Candidates

- `gh pr list --state open --limit 50 --json number,title,author,headRefName,baseRefName,isDraft,headRepositoryOwner,reviewDecision,updatedAt`.
- Keep only Repo-owner heads, authored by Self. Save each result under Scratch and pass the paths to the collector.
- Per PR (cap the check at the 10 most recently updated), run the threads query below and `gh pr view <n> --json latestReviews,reviewRequests,author`.
- Keep a PR when any of these holds: an unresolved, non-outdated thread whose last comment is not by the PR author; a reviewer question (comment ending `?` or a review body asking one) with no later reply by the author; a latest effective review of `CHANGES_REQUESTED`.
- Only PRs authored by Self are offered; a typed number must be one of them. Print number, title, head → base, and the reason each qualified.

## Branch

Fork head (`isCrossRepository`) → stop. Remote = the one whose URL matches Repo. Head ref = `headRefName`; expected head SHA = `headRefOid` re-read after the fetch (`gh pr view <n> --json headRefOid`).

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
- Revision summary (one general comment after the replies, when drafted): same endpoint as a general comment; skip when `cr:<n>:summary` is in `ops[]`, else record that key after success (`state.md` `## Idempotency`).
- Never call: merge, approve, dismiss, delete or minimize comment, `unresolveReviewThread`, branch protection, or any `gh pr` write.

## Re-request

`gh api repos/<owner>/<repo>/pulls/<n>/requested_reviewers -X POST -F 'reviewers[]=<login>'` per target (the REST endpoint adds reviewers; the GraphQL `requestReviews` mutation replaces the list unless `union` is true, so it is not used). `403` or `422` (not a collaborator or no write access) → report the exact error, skip that reviewer, continue.

## Verify after mutations

Re-read threads and comments: each posted reply is present once (marker match); each resolved thread has `isResolved` true; `gh pr view <n> --json reviewRequests` lists each re-requested login. Mismatch → report the field; do not retry a reply, only re-check.
