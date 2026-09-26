---
name: address-merge-request-review
description: Address reviewer feedback on your own GitLab merge request. Remediate every blocking thread with new signed commits (never force-push), reply to each thread (fix, clarification question, or explained decline), resolve only agreed non-substantive threads, post a revision summary, and re-request review after significant changes. Picks the current branch's open MR, else asks which of your MRs with open review. Use only when the user explicitly asks to address or respond to MR review feedback, e.g. "address the review comments", "fix the MR feedback", "respond to the review on !42", "reply to the MR comments", "resolve the review threads", "the reviewer requested changes on my MR". Do not use on your own after finishing a task.
argument-hint: '[optional MR iid]'
allowed-tools: Bash(git rev-parse *) Bash(git status *) Bash(git diff *) Bash(git log *) Bash(git config --get *) Bash(git remote -v) Bash(git fetch *) Bash(mktemp *) Bash(date -u *) Bash(glab auth status) Bash(glab api user) Bash(glab api projects/:id) Bash(glab mr list *) Bash(glab api --paginate projects/:id/merge_requests/*)
---

# Address Merge Request Review

Input: $ARGUMENTS

## Rules

- Author side only. Reviewer side = `cdk:review-merge-request`.
- Standard = `${CLAUDE_SKILL_DIR}/replies.md` + `${CLAUDE_SKILL_DIR}/../review-merge-request/guidelines.md` (`## Labels`, `## Comment quality`) + repo docs.
- Every blocking thread gets Fix, Clarify, or Decline with justification (blocking `question` may get Answer, stays open). None skipped.
- Never force-push, amend, rebase, or rewrite pushed commits. New commits only.
- Resolve only per `replies.md` `## Resolve rule`, only after step 9 confirmation.
- Never commit or push before step 6 confirmation; never post or resolve before step 9 confirmation.
- Reply and summary bodies in plain English, full sentences; never compressed style.
- Model text (JSON bodies, commit subjects) via scratch file (`--input`, `git commit -F`); never inline in shell args. `-f` only for API-sourced values.
- Reads only via `glab api --paginate …` (pre-approved). Writes (POST, PUT, graphql, commit, push) stay permission-prompted.
- Issue → check `## Known issues` first. New fix → append `- <symptom> → <fix>` to source SKILL.md (repo path, not plugin cache); not writable → print line for user.

## Workflow

1. Pre-flight. `glab auth status` fail → stop, tell user `glab auth login`. `glab api projects/:id` fail → report exact error line, stop; keep `id`, `path_with_namespace`. Self = `glab api user` (`id`, `username`). Root = `git rev-parse --show-toplevel`. Scratch = `mktemp -d`.
2. Identify MR.
   - Input iid (strip `!`) → `glab api --paginate projects/:id/merge_requests/<iid>`; `state` not `opened` → report, stop. Author not self → AskUserQuestion: Continue (co-author) | Cancel.
   - Else current = `git rev-parse --abbrev-ref HEAD`; `glab mr list --source-branch <current> -F json`: one match → use it; several → ask from matches.
   - Else `glab mr list --author <username> -F json`. Keep MRs with an unresolved resolvable thread or a reviewer `state` = `requested_changes` (`…/merge_requests/<iid>/reviewers`). None → stop, report "no MR with open review". Else AskUserQuestion: up to 4 by `updated_at` desc, label `!<iid> <title>`, description `<source> → <target>, <n> open threads`.
3. Branch guard. Remote = `git remote -v` entry whose URL matches source project (`source_project_id` → `glab api projects/<source_project_id>` `ssh_url_to_repo`/`http_url_to_repo`); none → stop, report. Current ≠ `source_branch` → AskUserQuestion: Switch (`git switch <source_branch>`) (Recommended) | Cancel. `git status --porcelain` non-empty → stop, tell user commit or stash first. `git fetch <remote> <source_branch>`; behind → `git pull --ff-only <remote> <source_branch>`; diverged → stop, report (no force, no rebase).
4. Fetch threads. `glab api --paginate projects/:id/merge_requests/<iid>/discussions`. Drop system notes and discussions started by self. Keep:
   - Resolvable, unresolved threads.
   - Non-resolvable individual notes by others created after self's last commit or note on the MR (never resolve candidates).
   - Status per thread: last note by self → "awaiting reviewer", skip unless user re-includes in step 5; else "needs response". Triage on latest reviewer note (answer to earlier Clarify drives the fix).
   - Keep discussion `id`, `position.new_path`/`new_line` (else "general"), author, note chain.
   - Label: match `^\**<label>\s*(\(<decorations>\))?:` (bold optional) against first note. No decoration → default from guidelines `## Labels`. `blocking` anywhere in list → blocking. No label → reviewer `requested_changes` → blocking, mark "assumed"; else non-blocking.
   - None "needs response" → stop, report "no open threads".
5. Triage. Read code at each path:line. Propose disposition per `replies.md` `## Dispositions`: Fix | Clarify | Decline | Answer. Show table: thread id (short), label (decoration), path:line, reviewer, status, disposition, one-line plan or reason. AskUserQuestion: Proceed (Recommended) | Edit | Cancel. Edit → AskUserQuestion per thread batch (≤4): new disposition or include awaiting thread; re-show. Cancel → stop, nothing changed. No Fix → skip steps 6–7, Commits: none.
6. Remediate. Old head = `git rev-parse HEAD`. Apply each Fix at root, scoped to the thread's expected outcome. Run repo checks (CLAUDE.md commands, else `package.json` scripts: format, lint, test when present). Fail → fix root cause, re-run. Show `git diff --stat` and diff grouped by thread. AskUserQuestion: Commit + push (Recommended) | Commit only | Revise | Cancel. Revise → apply feedback, re-run checks, re-show. Cancel → keep edits uncommitted, stop, nothing posted.
7. Commit + push. Group fixes into atomic commits, one logical change each. Message: Conventional Commits, subject only, ≤72 chars, imperative, no attribution (repo commitlint and `.claude/rules/git.md` win). Write subject to scratch file; `git add <files>`; sign when `git config --get commit.gpgsign` = true or repo rules require it: `git commit -S -F <file>`, else `git commit -F <file>`; hook fail → fix, re-commit. Signing expected → `git log --show-signature <old head>..HEAD` every commit good, else report, stop. Commit only → stop after commits, report; nothing posted (replies would cite unpushed SHAs). Push: `git push <remote> HEAD:<source_branch>` (never `--force`, `--force-with-lease`); rejected → report exact line, stop. Map thread id → short SHA.
8. Draft replies per `replies.md` `## Reply templates`: one per thread. Draft revision summary per `## Revision summary template`.
9. Preview. Show each reply (thread, disposition, body), then summary. Resolve candidates per `replies.md` `## Resolve rule`. AskUserQuestion multiSelect: candidates to resolve (≤4 per question, batched; none selected = resolve none). Then AskUserQuestion: Post (Recommended) | Edit | Cancel. Edit → revise text, re-show. Cancel → stop; report pushed commits.
10. Post. Start = `date -u +%Y-%m-%dT%H:%M:%SZ`. Re-fetch MR up to 3 times, 5 s apart, until `diff_refs.head_sha` = pushed HEAD (or old head when no commits). Head is a commit not ours → report "new commits on MR", stop. Still stale after retries → report, stop. Per reply: write `{"body":…}` to scratch; `glab api projects/:id/merge_requests/<iid>/discussions/<id>/notes -X POST -H 'Content-Type: application/json' --input <file>`. Per chosen resolve: write `{"resolved":true}`; `glab api projects/:id/merge_requests/<iid>/discussions/<id> -X PUT -H 'Content-Type: application/json' --input <file>`. Summary: write `{"body":…}`; `glab api projects/:id/merge_requests/<iid>/notes -X POST -H 'Content-Type: application/json' --input <file>`. Error → report exact line and list already posted; stop.
11. Re-request review. Significant = any Fix or Decline on a blocking thread, or any Fix touching non-test, non-doc code. Targets = reviewers with `state` `requested_changes`, else all MR reviewers except self and `approved`. AskUserQuestion: Re-request (Recommended when significant) | Skip. Per target: write `{"query":"mutation($p:ID!,$i:String!,$u:UserID!){mergeRequestReviewerRereview(input:{projectPath:$p,iid:$i,userId:$u}){errors}}","variables":{"p":"<path_with_namespace>","i":"<iid>","u":"gid://gitlab/User/<id>"}}` to scratch; `glab api graphql -X POST -H 'Content-Type: application/json' --input <file>`. Top-level `errors` or `data.mergeRequestReviewerRereview.errors` non-empty, or HTTP error → report exact line, continue with next target.
12. Verify. `glab api --paginate projects/:id/merge_requests/<iid>/discussions`: self notes with `created_at` ≥ start = replies + 1 (summary); chosen threads `resolved` true. Re-requested → `…/reviewers` shows targets `state` no longer `requested_changes`. Mismatch → report field, stop.

## Output

```text
MR: !<iid> <web_url>
Commits: <short SHA> <subject> (one per line) | none
Threads: <f> fixed, <c> clarified, <d> declined, <a> answered, <w> awaiting reviewer
Resolved: <n>; left open: <m>
Summary posted: yes | no
Review re-requested: @<user>, … | no
```

## Known issues

- none
