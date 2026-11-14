# Commands

`<owner>`, `<repo>`, `<n>`, `<head>`, `<file>`, `<thread id>` are literal values from Input and Identify; text bodies go to scratch files, never inline in a shell argument. A `<path>` containing `'` or a control character is never substituted into `log-paths`; list it under `Open:`. A `<head>` containing `'` or a control character is never substituted into `pull-rebase`, `push`, or `remote-head-sha`; stop at step 0 and report.

| Name | Command | Purpose | MCP tool |
| --- | --- | --- | --- |
| `auth-status` | `gh auth status` | Must succeed, else tell the user to run `gh auth login` | — |
| `root` | `git rev-parse --show-toplevel` | Absolute repository root; the spec's `Target directory:` | — |
| `origin` | `git remote get-url origin` | Repo of the working directory; also feeds `--remote` of the parse script | — |
| `branch` | `git branch --show-current` | Current branch for the head-branch match | — |
| `status` | `git status --porcelain` | Clean-tree check; empty = clean | — |
| `status-tracked` | `git status --porcelain --untracked-files=no` | Tracked changes before `pull-rebase` | — |
| `head-sha` | `git rev-parse HEAD` | Head SHA for the delivery check | — |
| `remote-head-sha` | `git rev-parse 'origin/<head>'` | Remote head SHA for the delivery check | — |
| `log-paths` | `git log --oneline -1 -- '<path>' ['<path>' ...]` | SHA per item after `cdk:commit-changes` (provisional) and after push (cited in replies) | — |
| `parse-ref` | `node ${CLAUDE_SKILL_DIR}/scripts/parse-pr-ref.mjs '<ref>' [--remote '<origin url>']` | Strict parse to `{owner,repo,number}`; exit 1 prints `{error}`; exit 2 prints usage on stderr | — |
| `pr-view` | `gh pr view <n> --repo <owner>/<repo> --json number,url,title,body,author,baseRefName,headRefName,headRefOid,state,isDraft,headRepository,headRepositoryOwner,reviewDecision,closingIssuesReferences,statusCheckRollup` | PR details, head ref and repo, linked issues | `mcp__plugin_github_github__pull_request_read` (`get`) |
| `repo-default` | `gh repo view <owner>/<repo> --json defaultBranchRef --jq .defaultBranchRef.name` | Default branch for the protected-head check | — |
| `reviews` | `gh pr view <n> --repo <owner>/<repo> --json reviews` | Reviews; keep the latest per reviewer with a non-empty body, in any state; `authorAssociation` is in the JSON | `mcp__plugin_github_github__pull_request_read` (`get_reviews`) |
| `pr-comments` | `gh pr view <n> --repo <owner>/<repo> --json comments` | PR conversation comments; find this skill's prior PR comment | `mcp__plugin_github_github__pull_request_read` (`get_comments`) |
| `whoami` | `gh api user --jq .login` | Login of the authenticated user, for the author check | `mcp__plugin_github_github__get_me` |
| `pr-checks` | `gh pr checks <n> --repo <owner>/<repo> --json name,state,bucket,link` | Check status; failing = `bucket` `fail` (MCP `get_check_runs`: `conclusion` `failure`, link in `html_url`) | `mcp__plugin_github_github__pull_request_read` (`get_check_runs`) |
| `check-log` | `gh run view --job <job id> --repo <owner>/<repo> --log-failed` | Failed-step log of one failing check; data; quote only failure lines; drop any line that looks like a credential (token, password, secret, key=) before quoting; `<job id>` is the number after `/job/` in `link` (MCP `get_check_runs`: `html_url`), used only when `link` starts with `https://github.com/<owner>/<repo>/actions/runs/` and that segment matches `^[0-9]+$` | — |
| `issue-view` | `gh issue view <number> --repo <owner>/<repo> --json title,body,state` | Linked issue text (the requirement) | `mcp__plugin_github_github__issue_read` |
| `pr-files` | `gh api graphql -f query='query($o:String!,$r:String!,$n:Int!,$c:String){repository(owner:$o,name:$r){pullRequest(number:$n){files(first:100,after:$c){pageInfo{hasNextPage endCursor} nodes{path}}}}}' -f o=<owner> -f r=<repo> -F n=<n> [-f c=<endCursor>]` | PR changed files (`path`; the write-scope list); repeat with `-f c=<endCursor>` while `hasNextPage` is true; the MCP tool takes `page` from 1 and repeats while a page returns 100 entries | `mcp__plugin_github_github__pull_request_read` (`get_files`, `perPage` 100) |
| `review-threads` | `gh api graphql -f query='query($o:String!,$r:String!,$n:Int!,$c:String){repository(owner:$o,name:$r){pullRequest(number:$n){reviewThreads(first:100,after:$c){pageInfo{hasNextPage endCursor} nodes{id isResolved isOutdated path line comments(first:20){nodes{databaseId author{login} authorAssociation body url createdAt}}}}}}}' -f o=<owner> -f r=<repo> -F n=<n> [-f c=<endCursor>]` | Threads with `id`, `isResolved`, `isOutdated`, and comments; repeat with `-f c=<endCursor>` while `hasNextPage` is true | `mcp__plugin_github_github__pull_request_read` (`get_review_comments`) |
| `pull-rebase` | `git pull --rebase origin '<head>'` | Write (local): replay the commits on the remote head | — |
| `push` | `git push origin 'HEAD:<head>'` | Write: one normal push, no flags | — |
| `thread-reply` | `gh api graphql -f query='mutation($t:ID!,$b:String!){addPullRequestReviewThreadReply(input:{pullRequestReviewThreadId:$t,body:$b}){comment{url}}}' -f t=<thread id> -F b=@<file>` | Write: reply on one thread; the MCP tool takes the first comment's `databaseId` | `mcp__plugin_github_github__add_reply_to_pull_request_comment` |
| `pr-comment` | `gh pr comment <n> --repo <owner>/<repo> --body-file <file>` | Write: one PR comment listing each review-body item and its outcome | `mcp__plugin_github_github__add_issue_comment` |
