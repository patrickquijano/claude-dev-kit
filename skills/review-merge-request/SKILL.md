---
name: review-merge-request
description: Review a GitLab merge request against bundled best practices (GitLab code review guide, Conventional Comments) and repo standards, then post severity-labeled inline and overall comments as one review, requesting changes when blocking items exist, approving and merging when all approval criteria pass and the user confirms, and resolving the user's own earlier threads that the new code addresses. Picks the current branch's open MR, else asks which open MR. Use only when the user explicitly asks to review a GitLab merge request, e.g. "review this MR", "review my merge request", "review !42", "do a code review on the MR". Do not use on your own after finishing a task.
argument-hint: '[optional MR iid]'
allowed-tools: Bash(git rev-parse *) Bash(mktemp *) Bash(glab auth status) Bash(glab api user) Bash(glab api projects/:id) Bash(glab mr list *) Bash(glab api -X GET projects/:id/merge_requests/*) Bash(glab api projects/:id/merge_requests/*/approvals) Bash(glab api projects/:id/merge_requests/*/reviewers) Bash(glab api projects/:id/merge_requests/*/draft_notes*) Bash(glab api projects/:id/merge_requests/*/approve -X POST *) Bash(glab api projects/:id/merge_requests/*/unapprove -X POST) Bash(glab api projects/:id/merge_requests/*/discussions/* -X PUT -F resolved=true) Bash(glab api --paginate projects/:id/merge_requests/*/diffs) Bash(glab api --paginate projects/:id/merge_requests/*/discussions)
---

# Review Merge Request

Input: $ARGUMENTS

## Rules

- User interaction (AskUserQuestion) only here; subagents can't ask.
- Standard = `${CLAUDE_SKILL_DIR}/guidelines.md` + repo docs. Every comment follows its templates, labels, and quality rules.
- Never post before step 7 confirmation. Approve only when A1–A7 all pass and user picks Publish + approve. Merge only when A1–A7 all pass, self approval is in, the review is verified, and user picks Merge; merge is hard to reverse. Never push, commit, or edit code.
- Resolve only threads self started (other reviewers own their concerns), and only when the agent marks them addressed.
- Comment bodies in plain English, full sentences; never compressed style.
- JSON request bodies via file + `--input`; never inline user text in shell args. `-f`/`-F` only for API-sourced values (SHAs) or fixed literals.
- Never change MR reviewers without step 8 consent; never remove existing reviewers.
- Fetch the MR object only as `glab api -X GET …` ("re-fetch" means this call). Merge and reviewer PUT stay out of `allowed-tools`, so each gets a permission prompt as a second confirmation.
- Issue → check `## Known issues` first. Fix for a recurring or workflow-blocking issue → append `- <symptom> → <fix>` to source file (repo path, not plugin cache): skill issue → this SKILL.md; subagent "Known issue:" line → `agents/mr-reviewer.md`. Not writable → print line for user.

## Workflow

1. Pre-flight. `glab auth status` fail → stop, tell user `glab auth login`. `glab api projects/:id` fail → report exact error line, stop. Self = `glab api user` (`id`, `username`). Root = `git rev-parse --show-toplevel`. Scratch = `mktemp -d`.
2. Identify MR.
   - Input iid (strip leading `!`) → `glab api -X GET projects/:id/merge_requests/<iid>`; `state` not `opened` → report, stop.
   - Else current = `git rev-parse --abbrev-ref HEAD`; `glab mr list --source-branch <current> -F json`: one match → use it; several (forks) → ask as below from matches.
   - Else `glab mr list -F json` (open). Empty → stop, report "no open MRs". Else sort by `updated_at` desc; AskUserQuestion: up to 4, label `!<iid> <title>`, description `<source> → <target>, @<author>`. Other → typed iid; must be open MR, else re-ask.
3. Fetch. `glab api -X GET projects/:id/merge_requests/<iid>`: keep `title`, `description`, `author`, `reviewers`, `source_branch`, `target_branch`, `web_url`, `diff_refs`, `head_pipeline`, `detailed_merge_status`, `draft`. Reviewer states: `glab api projects/:id/merge_requests/<iid>/reviewers`. `diff_refs` empty → retry up to 3 times, still empty → stop. Approvals: `glab api projects/:id/merge_requests/<iid>/approvals` (`approvals_left`, `approved_by`). Diffs: `glab api --paginate projects/:id/merge_requests/<iid>/diffs` → save to `<scratch>/diffs.json`. Existing threads: `glab api --paginate projects/:id/merge_requests/<iid>/discussions` → digest (path:line + first line per note). Own threads = discussions whose first note has `author.id` = self id, `resolvable: true`, `resolved: false`; add each to digest as `own <discussion id>` with path:line and full first-note body.
4. Review. Spawn `cdk:mr-reviewer` with root, iid, `diff_refs`, diffs file path, title, description, guidelines path `${CLAUDE_SKILL_DIR}/guidelines.md`, digest. Keep its findings, threads, and criteria blocks. Kept threads = entries whose id is an own thread and `addressed: yes`; drop the rest (never resolve an unaddressed thread).
5. Validate positions against `diffs.json`. Each finding line must sit in a hunk of its path: `new` → added line, `old` → removed line, `both` → context line. Invalid, `none`, or file with empty `diff` (collapsed/too large) → move to overall comment under "General". Suggestion on `old` line → drop suggestion.
6. Evaluate approval criteria per guidelines `## Approval criteria`.
   - A1, A3, A5, A6 → from agent `Criteria:`; missing line → fail "not assessed".
   - A2 → pass only if no kept `blocking` finding (inline or General).
   - A4 → pass only if `head_pipeline.status` = `success` and `detailed_merge_status` not `ci_must_pass`, `ci_still_running`, `status_checks_must_pass`, `checking`, or `unchecked`. `head_pipeline` null and no such status → pass, note "no pipeline found (may not be created yet)". Pending/running/checking → fail "checks not finished; re-run review after they finish".
   - A7 → pass if `approvals_left` = 0, or = 1 and self not in `approved_by`. Else fail, list pending approvals.
   - Self already in `approved_by` → approval skipped, noted; `skipped` wins over failed criteria in Output.
   - Merge blockers (merge not offered, list each): any criterion fails; `draft` true; `detailed_merge_status` not `mergeable` or `not_approved`; another reviewer `state` = `requested_changes`; unresolved `resolvable` discussion that is not a kept thread (others' concerns stand).
7. Preview. Show table: id, label (decoration), path:line, subject; then kept threads: thread id, path:line, reply; then A1–A7 checklist; then merge blockers; then draft overall comment (guidelines overall template). AskUserQuestion: all criteria pass and not skipped → Publish + approve (Recommended) | Publish only | Edit | Cancel; else → Publish (Recommended) | Edit | Cancel. No merge blockers → same AskUserQuestion call adds a second question (header "Merge"): Merge after publish (Recommended, uses MR squash and delete-branch settings) | Don't merge. Merge applies only with Publish + approve, or with Publish when self already approved; other combos → not merged, Output `Merged: no (approval not given)`. Edit → AskUserQuestion: Drop some | Revise. Drop → multiSelect of finding and thread ids, ≤4 per question, batched. Revise → apply feedback. After Edit → re-validate, re-evaluate, re-show. Cancel → stop, nothing posted.
8. State. Any kept `blocking` finding → `requested_changes`, verdict "Changes requested"; approving → `reviewed`, verdict "Approved"; else `reviewed`, verdict "Looks good to me". Self not in `reviewers` → AskUserQuestion: Add me as reviewer (Recommended, needed to set review state) | Publish without state. Add → write `{"reviewer_ids":[<existing ids>,<self id>]}` to scratch, `glab api projects/:id/merge_requests/<iid> -X PUT -H 'Content-Type: application/json' --input <file>`.
9. Publish.
   - Pre-check: re-fetch MR; `diff_refs.head_sha` changed → report "new commits pushed", stop (re-run review). `glab api projects/:id/merge_requests/<iid>/draft_notes` non-empty (your old drafts; bulk publish sends them all) → AskUserQuestion: Delete old drafts (Recommended) | Publish them too | Cancel.
   - Approving → approve first: `glab api projects/:id/merge_requests/<iid>/approve -X POST -f sha=<head_sha>` (step 3 head). `409` → report "new commits pushed", stop, nothing posted. Other error (e.g. `401`, self-approval disabled) → report exact error line; verdict becomes "Looks good to me" with note "Approval failed: <error>"; continue.
   - Per inline finding: render inline template; write `{"note":…,"position":{"position_type":"text","base_sha":…,"start_sha":…,"head_sha":…,"old_path":…,"new_path":…,<lines>}}` to scratch. `<lines>`: `new` → `new_line` only; `old` → `old_line` only; `both` → both. Renames keep distinct `old_path`/`new_path`. `glab api projects/:id/merge_requests/<iid>/draft_notes -X POST -H 'Content-Type: application/json' --input <file>`. Keep returned `id`.
   - Before approve, record max note `id` from step 3 discussions (verify baseline).
   - Per kept thread: write `{"note":"**note:** Addressed in <short head_sha>. <reply>","in_reply_to_discussion_id":<id>,"resolve_discussion":true}` to scratch; POST to `draft_notes` as above. Keep returned `id`.
   - Then write `{"note":<overall>,"reviewer_state":<state>}` (omit `reviewer_state` if Publish without state); `glab api projects/:id/merge_requests/<iid>/draft_notes/bulk_publish -X POST -H 'Content-Type: application/json' --input <file>`.
   - Any create or publish fails → report exact error line; delete created drafts `glab api projects/:id/merge_requests/<iid>/draft_notes/<id> -X DELETE`; approved in this step → `glab api projects/:id/merge_requests/<iid>/unapprove -X POST`; report reviewer added in step 8 (not reverted); stop. Never publish partial review.
10. Verify. `glab api --paginate projects/:id/merge_requests/<iid>/discussions`: notes by self with `system: false` and `id` above baseline = inline count + thread count + old drafts published + 1. Each kept thread: first note `resolved: true`; else `glab api projects/:id/merge_requests/<iid>/discussions/<id> -X PUT -F resolved=true`, re-check; still unresolved → mismatch `thread <id>`. State set → `glab api projects/:id/merge_requests/<iid>/reviewers`: self `state` matches. Approved → `glab api projects/:id/merge_requests/<iid>/approvals`: self in `approved_by`. Mismatch → report field, stop (no merge).
11. Merge (user picked Merge). Re-fetch MR: `diff_refs.head_sha` changed → report "new commits pushed", stop. `detailed_merge_status` `checking` or `approvals_syncing` → re-fetch up to 3 times. Require `state` = `opened`, `detailed_merge_status` = `mergeable`, and `/approvals` `approvals_left` = 0; else report the field, stop. `glab api projects/:id/merge_requests/<iid>/merge -X PUT -f sha=<head_sha>` (step 3 head; guards against new commits). Response `state` = `merged` → done; other state without error → re-fetch, report `state`, Merged: no (pending). `409` → report "new commits pushed"; `405`/`406`/`422` → report exact error line and current `detailed_merge_status`; `401` → report no merge permission. On any merge error the review and approval stay posted; stop.

## Output

```text
MR: !<iid> <web_url>
Findings: <n> inline, <m> general (<b> blocking)
Review state: requested_changes | reviewed | none
Approval: approved | not approved (<failed criteria ids>) | skipped (already approved)
Reviewer added: yes | no
Threads resolved: <n> of <own unresolved>
Merged: yes | no (<error or reason>) | not offered (<blockers>) | not requested
```

## Known issues

- none
