---
name: address-merge-request-review
description: Address reviewer feedback on your own GitLab merge request. Remediate every blocking thread with new signed commits (never force-push), reply to each thread (fix, clarification question, or explained decline), resolve only non-substantive threads that meet the resolve rule, post a revision summary, and re-request review after significant changes. Picks the current branch's open MR, else asks which of your MRs with open review. Use only when the user explicitly asks to address or respond to MR review feedback, e.g. "address the review comments", "fix the MR feedback", "respond to the review on !42", "reply to the MR comments", "resolve the review threads", "the reviewer requested changes on my MR". Do not use on your own after finishing a task.
argument-hint: '[optional MR iid] [self-review]'
allowed-tools: Bash(git rev-parse *) Bash(git status *) Bash(git diff *) Bash(git log *) Bash(git config --get *) Bash(git remote -v) Bash(mktemp *) Bash(date -u *) Bash(sleep 5) Bash(glab auth status) Bash(glab api user) Bash(glab api projects/:id) Bash(glab mr list *) Bash(glab api -X GET projects/:id/merge_requests/*) Bash(glab api -X GET --paginate projects/:id/merge_requests/*)
---

# Address Merge Request Review

Input: $ARGUMENTS

## Rules

- Author side only. Reviewer side = `cdk:review-merge-request`.
- Standard = `${CLAUDE_SKILL_DIR}/replies.md` + `${CLAUDE_SKILL_DIR}/../review-merge-request/guidelines.md` (`## Labels (Conventional Comments)`, `## Comment quality`) + repo docs.
- User interaction (AskUserQuestion), fixes, commits, posting, and resolving only here; `cdk:review-thread-triager` only proposes.
- Every blocking thread gets Fix, Clarify, or Decline with justification (blocking `question` may get Answer, stays open). None skipped.
- Never force-push, amend, rebase, or rewrite pushed commits. New commits only.
- Resolve only per `replies.md` `## Resolve rule`.
- Push without asking after step 7 commit verification passes (the request to address review counts as consent to a normal push). Switch, commit, re-request review, post replies and the summary, and resolve candidates, without asking the user to confirm them (steps 3, 7, 10, 11).
- Reply and summary bodies in plain English, full sentences; never compressed style.
- Model text (JSON bodies, commit subjects) via scratch file (`--input`, `git commit -F`); never inline in shell args. GitLab API reads and writes per `${CLAUDE_SKILL_DIR}/../submit-merge-request/gitlab.md` `## API reads and writes`.
- `allowed-tools` pre-approves reads only. Other reads (`glab api projects/<source_project_id>`) and every write (`git switch`, `git pull`, `git commit`, POST, PUT, graphql, push) stay permission-prompted.
- Commits and subjects per `${CLAUDE_SKILL_DIR}/../commit-changes/conventions.md` (`## Commit subject`, `## Signing`); always `git commit -S -F <file>`, never `--no-verify` or `--no-gpg-sign`. Signing not configured → stop at step 3.
- Caps: triager re-spawn with answers (step 5) once; check fixes (step 6), commitlint redrafts, and hook fixes (step 7) 3 attempts each; MR re-fetch (step 10) 3 attempts, 5 s apart. Cap hit → report, stop.
- `self-review` input token (set by `cdk:ship-changes`) = the user reviewed their own MR; keep threads self started, and the user answers Clarify questions in step 5 instead of a posted question.
- Chained by other skills via the Skill tool; never set `disable-model-invocation: true` (it blocks that invocation).
- AskUserQuestion unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/fallbacks.md`.
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `address-merge-request-review`.

## Workflow

1. **Pre-flight.** Per `${CLAUDE_SKILL_DIR}/../submit-merge-request/gitlab.md` `## Pre-flight` (keep `id`, `path_with_namespace`, Self, Root, Scratch).
2. **Identify MR.**
   - Input iid (strip `!`; ignore the `self-review` token) → `glab api -X GET projects/:id/merge_requests/<iid>`; `state` not `opened` → report, stop. Author not self → AskUserQuestion: Continue (co-author) | Cancel.
   - Else current = `git rev-parse --abbrev-ref HEAD`; `glab mr list --source-branch <current> -F json`: one match → use it; several → ask from matches.
   - Else `glab mr list --author <username> -F json`. Keep MRs with an unresolved resolvable thread or a reviewer `state` = `requested_changes` (`glab api -X GET projects/:id/merge_requests/<iid>/reviewers`). None → report "no MR with open review", `Result: nothing-to-do`, stop. Else AskUserQuestion: up to 4 by `updated_at` desc, label `!<iid> <title>`, description `<source> → <target>, <n> open threads`.
3. **Branch guard.** `git status --porcelain` non-empty → stop, tell user commit or stash first (checked before any switch). Remote = `git remote -v` entry whose URL matches source project (`source_project_id` → `glab api projects/<source_project_id>` `ssh_url_to_repo`/`http_url_to_repo`); none → stop, report. Current ≠ `source_branch` → `git switch <source_branch>` without asking (tree verified clean). Signing per conventions.md `## Signing` (read the allowed signers file to check the key); missing or mismatch → stop, tell user what to set. `git fetch <remote> <source_branch>`; behind → `git pull --ff-only <remote> <source_branch>`; diverged → stop, report (no force, no rebase). Old head = `git rev-parse HEAD` (step 10 uses it when steps 6–7 are skipped).
4. **Fetch threads.** `glab api -X GET --paginate projects/:id/merge_requests/<iid>/discussions` → save to `<scratch>/discussions.json`. Reviewer states: `glab api -X GET projects/:id/merge_requests/<iid>/reviewers`. Drop system notes and discussions started by self (self-review mode: keep self-started resolvable, unresolved threads; status "needs response" unless self replied after the first note). Keep:
   - Resolvable, unresolved threads.
   - Non-resolvable individual notes by others created after self's last commit or note on the MR (never resolve candidates).
   - Not self-review: status per thread: last note by self → "awaiting reviewer", skip unless input names the thread; else "needs response".
   - None "needs response" → report "no open threads", `Result: nothing-to-do`, stop.
5. **Triage.** Spawn one `cdk:review-thread-triager` with: iid, discussions file path, kept thread ids + status, root, `${CLAUDE_SKILL_DIR}/replies.md`, `${CLAUDE_SKILL_DIR}/../review-merge-request/guidelines.md`, source ref `HEAD`, target ref `diff_refs.base_sha` (fallback `<remote>/<target_branch>`), self-review yes/no, any reviewer `requested_changes` yes/no. Keep its per-thread block; its `Question:` lines → AskUserQuestion, re-spawn once with answers; its `Known issue:` lines → handle per Rules. Show table: thread id (short), label (decoration), blocking (assumed), path:line, reviewer, status, disposition, one-line plan or reason. Self-review mode: each Clarify → AskUserQuestion with the triager's question (header "Clarify", 2–4 concrete answer options); the answer sets Fix, Decline, or Answer, and no question is posted. The table is informational; continue without asking. No Fix → skip steps 6–7, Commits: none. `already-done` → no code change; Fix reply citing the commit the triager names.
6. **Remediate.** Apply each Fix at root per the triager plan, scoped to the thread's expected outcome. Run repo checks (CLAUDE.md commands, else `package.json` scripts: format, lint, test when present). Fail → fix root cause, re-run. Show `git diff --stat` and diff grouped by thread. Step 7 commits and pushes without asking.
7. **Commit + push.** Group fixes into atomic commits, one logical change each; subject per conventions.md `## Commit subject`. Write subject to `<scratch>/msg`; commitlint config (`commitlint.config.*`, `.commitlintrc*`, or `commitlint` in `package.json`) → `npx --no-install commitlint --edit <scratch>/msg` (permission-prompted); fail → redraft; not installed → skip, note it. `git add -- <files>`; `git commit -S -F <scratch>/msg`; signing fails → stop per conventions.md `## Signing`; other hook fail → fix, re-commit. `git log --format='%h %G?' <old head>..HEAD`: every `%G?` = `G`, else report, stop. Push: `git push <remote> HEAD:<source_branch>` (never `--force`, `--force-with-lease`); rejected → report exact line, stop. Map thread id → short SHA.
8. **Draft.** Replies from the triager reply skeletons, completed per `replies.md` `## Reply templates`: one per thread. Draft revision summary per `## Revision summary template`.
9. **Preview.** Show each reply (thread, disposition, body), then summary. Resolve candidates = triager resolve-candidate flag, re-checked per `replies.md` `## Resolve rule`; list them. The preview is informational; continue to step 10 without asking.
10. **Post.** Start = `date -u +%Y-%m-%dT%H:%M:%SZ`. Re-fetch `glab api -X GET projects/:id/merge_requests/<iid>` until `diff_refs.head_sha` = pushed HEAD (or old head when no commits); before each retry run `sleep 5`. Head is a commit not ours → report "new commits on MR", stop. Still stale after 3 attempts → report, stop. Per reply: write `{"body":…}` to scratch; `glab api projects/:id/merge_requests/<iid>/discussions/<id>/notes -X POST -H 'Content-Type: application/json' --input <file>`. Per resolve candidate: write `{"resolved":true}`; `glab api projects/:id/merge_requests/<iid>/discussions/<id> -X PUT -H 'Content-Type: application/json' --input <file>`. Summary: write `{"body":…}`; `glab api projects/:id/merge_requests/<iid>/notes -X POST -H 'Content-Type: application/json' --input <file>`. Error → report exact line and list already posted; stop.
11. **Re-request review.** Significant = any Fix or Decline on a blocking thread, or any Fix touching non-test, non-doc code. Targets (self always excluded) = reviewers with `state` `requested_changes`, else all MR reviewers not `approved`. No targets (e.g. self-review only) or not significant → skip. Else re-request without asking. Per target: write `{"query":"mutation($p:ID!,$i:String!,$u:UserID!){mergeRequestReviewerRereview(input:{projectPath:$p,iid:$i,userId:$u}){errors}}","variables":{"p":"<path_with_namespace>","i":"<iid>","u":"gid://gitlab/User/<id>"}}` to scratch; `glab api graphql -X POST -H 'Content-Type: application/json' --input <file>`. Top-level `errors` or `data.mergeRequestReviewerRereview.errors` non-empty, or HTTP error → report exact line, continue with next target.
12. **Verify.** `glab api -X GET --paginate projects/:id/merge_requests/<iid>/discussions`: self notes with `created_at` ≥ start = replies + 1 (summary); resolve candidate threads `resolved` true. Re-requested → `glab api -X GET projects/:id/merge_requests/<iid>/reviewers` shows targets `state` no longer `requested_changes`. Mismatch → report field, stop.

## Output

```text
MR: !<iid> <web_url>
Commits: <short SHA> <subject> (one per line) | none
Threads: <f> fixed, <c> clarified, <d> declined, <a> answered, <w> awaiting reviewer
Resolved: <n>; left open: <m>
Pushed: <remote>/<branch> | no
Summary posted: yes | no
Review re-requested: @<user>, … | no
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
