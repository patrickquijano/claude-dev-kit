---
name: review-merge-request
description: Review a GitLab merge request against bundled best practices (GitLab code review guide, Conventional Comments) and repo standards, then post severity-labeled inline and overall comments as one review, requesting changes when blocking items exist, approving and merging when all approval criteria pass and the user confirms, and resolving the user's own earlier threads that the new code addresses. Picks the current branch's open MR, else asks which open MR. Use only when the user explicitly asks to review a GitLab merge request, e.g. "review this MR", "review my merge request", "review !42", "do a code review on the MR". Do not use on your own after finishing a task.
argument-hint: '[optional MR iid] [auto]'
allowed-tools: Bash(git rev-parse *) Bash(mktemp *) Bash(glab auth status) Bash(glab api user) Bash(glab api projects/:id) Bash(glab mr list *)
---

# Review Merge Request

Input: $ARGUMENTS

## Rules

- User interaction (AskUserQuestion) only here; subagents can't ask.
- Standard = `${CLAUDE_SKILL_DIR}/guidelines.md` + repo docs. Every comment follows its templates, labels, and quality rules.
- Post the review (comments, thread replies, review state) without asking the user to confirm its content. Approve only when A1–A7 all pass and user picks Approve in step 7. Merge only when A1–A7 all pass, self approval is in, the review is verified, and user picks Merge after publish in step 7; merge is hard to reverse. Never push, commit, or edit code.
- `auto` input token (set by `cdk:ship-changes`, whose one settings ask is the consent) answers the step 7 Approve and Merge questions with their recommended options when they apply; merge still needs A1–A7, no merge blockers, and the step 11 checks, and uses the MR's squash and delete-branch settings that `cdk:prepare-merge-request` set from the user's choices. Anything not clean → no merge, every blocker in `Merged:`. Under `auto`, A4 "no pipeline found" is also a merge blocker (a clean MR needs its checks passing).
- Resolve only threads self started (other reviewers own their concerns), and only when the agent marks them addressed.
- Comment bodies in plain English, full sentences; never compressed style.
- Change MR reviewers only to add self in step 8, without asking; never remove existing reviewers.
- GitLab API reads, writes, and request bodies per `${CLAUDE_SKILL_DIR}/../prepare-merge-request/gitlab.md` `## API reads and writes`. "Re-fetch" means `glab api -X GET projects/:id/merge_requests/<iid>`. Writes (draft notes, approve, unapprove, resolve, reviewer PUT, merge) stay out of `allowed-tools`, so each gets a permission prompt (the only confirmation for posting and reviewer PUT; a second one for approve and merge).
- Caps: empty `diff_refs` re-fetch (step 3) and merge-status re-fetch (step 11) 3 attempts each; invalid typed iid re-ask (step 2) 3 rounds. Cap hit → stop, report.
- Chained by other skills via the Skill tool; never set `disable-model-invocation: true` (it blocks that invocation).
- AskUserQuestion unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/fallbacks.md`.
- Final step: follow `${CLAUDE_SKILL_DIR}/../build-skill/resolve-findings.md` (scope: ask-only; sources: failed approval criteria A1–A7, merge blockers, General findings that could not be placed, `Merged: not offered`).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `review-merge-request`.

## Workflow

1. **Pre-flight.** Per `${CLAUDE_SKILL_DIR}/../prepare-merge-request/gitlab.md` `## Pre-flight` (keep Self, Root, Scratch).
2. **Identify MR.**
   - Input iid (strip leading `!`; ignore the `auto` token) → `glab api -X GET projects/:id/merge_requests/<iid>`; `state` not `opened` → report, stop.
   - Else current = `git rev-parse --abbrev-ref HEAD`; `glab mr list --source-branch <current> -F json`: one match → use it; several (forks) → ask as below from matches.
   - Else `glab mr list -F json` (open). Empty → report "no open MRs", `Result: nothing-to-do`, stop. Else sort by `updated_at` desc; AskUserQuestion: up to 4, label `!<iid> <title>`, description `<source> → <target>, @<author>`. Other → typed iid; must be open MR, else re-ask (max 3).
3. **Fetch.** `glab api -X GET projects/:id/merge_requests/<iid>`: keep `title`, `description`, `author`, `reviewers`, `source_branch`, `target_branch`, `web_url`, `diff_refs`, `head_pipeline`, `detailed_merge_status`, `draft`. Reviewer states: `glab api -X GET projects/:id/merge_requests/<iid>/reviewers`. `diff_refs` empty → re-fetch up to 3 times, still empty → stop. Approvals: `glab api -X GET projects/:id/merge_requests/<iid>/approvals` (`approvals_left`, `approved_by`). Diffs: `glab api -X GET --paginate projects/:id/merge_requests/<iid>/diffs` → save to `<scratch>/diffs.json`. Existing threads: `glab api -X GET --paginate projects/:id/merge_requests/<iid>/discussions` → digest (path:line + first line per note). Own threads = discussions whose first note has `author.id` = self id, `resolvable: true`, `resolved: false`; add each to digest as `own <discussion id>` with path:line and full first-note body.
4. **Review.** Spawn `cdk:mr-reviewer` with root, iid, `diff_refs`, diffs file path, title, description, guidelines path `${CLAUDE_SKILL_DIR}/guidelines.md`, digest. Keep its findings, threads, and criteria blocks. Kept threads = entries whose id is an own thread and `addressed: yes`; drop the rest (never resolve an unaddressed thread).
5. **Validate.** Positions against `diffs.json`. Each finding line must sit in a hunk of its path: `new` → added line, `old` → removed line, `both` → context line. Invalid, `none`, or file with empty `diff` (collapsed/too large) → General finding (step 9 posts each non-praise one as its own positionless thread; praise goes to the overall comment). Suggestion on `old` line → drop suggestion.
6. **Evaluate.** Approval criteria per guidelines `## Approval criteria`.
   - A1, A3, A5, A6 → from agent `Criteria:`; missing line → fail "not assessed".
   - A2 → pass only if no kept `blocking` finding (inline or General).
   - A4 → pass only if `head_pipeline.status` = `success` and `detailed_merge_status` not `ci_must_pass`, `ci_still_running`, `status_checks_must_pass`, `checking`, or `unchecked`. `head_pipeline` null and no such status → pass, note "no pipeline found (may not be created yet)". Pending/running/checking → fail "checks not finished; re-run review after they finish".
   - A7 → pass if `approvals_left` = 0, or = 1 and self not in `approved_by`. Else fail, list pending approvals.
   - Self already in `approved_by` → approval skipped, noted; `skipped` wins over failed criteria in Output.
   - Merge blockers (merge not offered, list each): any criterion fails; `draft` true; `detailed_merge_status` not in {`mergeable`, `not_approved`}; another reviewer `state` = `requested_changes`; unresolved `resolvable` discussion that is not a kept thread (others' concerns stand).
7. **Preview.** Show table: id, label (decoration), path:line, subject; then kept threads: thread id, path:line, reply; then A1–A7 checklist; then merge blockers; then draft overall comment (guidelines overall template, seeded from the agent `Overall:`; step 8 sets the verdict). The preview is informational; never ask to confirm, edit, or cancel the comments. `auto` → take the recommended answers, no question. Else all criteria pass and not skipped → AskUserQuestion (header "Approve"): Approve (Recommended) | Don't approve. No merge blockers → ask Merge (header "Merge"), in the same AskUserQuestion call as Approve when Approve is asked: Merge after publish (Recommended, uses MR squash and delete-branch settings) | Don't merge. Merge applies only with Approve, or when self already approved; other combos → not merged, Output `Merged: no (approval not given)`. No question applies → continue to step 8 without asking.
8. **State.** Any kept `blocking` finding → `requested_changes`, verdict "Changes requested"; approving → `reviewed`, verdict "Approved"; else `reviewed`, verdict "Looks good to me". Self not in `reviewers` → add self without asking (needed to set review state): write `{"reviewer_ids":[<existing ids>,<self id>]}` to scratch, `glab api projects/:id/merge_requests/<iid> -X PUT -H 'Content-Type: application/json' --input <file>`. Fail → report exact error line, publish without state.
9. **Publish.**
   - Pre-check: re-fetch MR; `diff_refs.head_sha` changed → report "new commits pushed", stop (re-run review). `glab api -X GET projects/:id/merge_requests/<iid>/draft_notes` non-empty (your old drafts; bulk publish sends them all) → AskUserQuestion: Delete old drafts (Recommended) | Publish them too | Cancel. Cancel → stop, nothing posted, `Result: cancelled`.
   - Baseline = max note `id` from step 3 discussions (step 10 counts notes above it).
   - Approving → approve first: `glab api projects/:id/merge_requests/<iid>/approve -X POST -f sha=<head_sha>` (step 3 head). `409` → report "new commits pushed", stop, nothing posted. Other error (e.g. `401`, self-approval disabled) → report exact error line; verdict becomes "Looks good to me" with note "Approval failed: <error>"; continue.
   - Per inline finding: render inline template; write `{"note":…,"position":{"position_type":"text","base_sha":…,"start_sha":…,"head_sha":…,"old_path":…,"new_path":…,<lines>}}` to scratch. `<lines>`: `new` → `new_line` only; `old` → `old_line` only; `both` → both. Renames keep distinct `old_path`/`new_path`. `glab api projects/:id/merge_requests/<iid>/draft_notes -X POST -H 'Content-Type: application/json' --input <file>`. Keep returned `id`.
   - Per General finding (non-praise): render inline template (`Where:` = `<path>:<line>` or `general`); write `{"note":…}` (no `position`; publishes as a resolvable thread) to scratch; POST to `draft_notes` as above. Keep returned `id`. Overall comment `**General**` lists only each subject + "see its thread".
   - Per kept thread: write `{"note":"**note:** Addressed in <short head_sha>. <reply>","in_reply_to_discussion_id":<id>,"resolve_discussion":true}` to scratch; POST to `draft_notes` as above. Keep returned `id`.
   - Then write `{"note":<overall>,"reviewer_state":<state>}` (omit `reviewer_state` when publishing without state); `glab api projects/:id/merge_requests/<iid>/draft_notes/bulk_publish -X POST -H 'Content-Type: application/json' --input <file>`.
   - Any create or publish fails → report exact error line; delete created drafts `glab api projects/:id/merge_requests/<iid>/draft_notes/<id> -X DELETE`; approved in this step → `glab api projects/:id/merge_requests/<iid>/unapprove -X POST`; report reviewer added in step 8 (not reverted); stop. Never publish partial review.
10. **Verify.** `glab api -X GET --paginate projects/:id/merge_requests/<iid>/discussions`: notes by self with `system: false` and `id` above baseline = inline count + General thread count + kept thread count + old drafts published + 1. Each kept thread: first note `resolved: true`; else `glab api projects/:id/merge_requests/<iid>/discussions/<id> -X PUT -F resolved=true`, re-check; still unresolved → mismatch `thread <id>`. State set → `glab api -X GET projects/:id/merge_requests/<iid>/reviewers`: self `state` matches. Approved → `glab api -X GET projects/:id/merge_requests/<iid>/approvals`: self in `approved_by`. Mismatch → report field, stop (no merge).
11. **Merge.** User picked Merge after publish. Re-fetch MR: `diff_refs.head_sha` changed → report "new commits pushed", stop. `detailed_merge_status` `checking` or `approvals_syncing` → re-fetch up to 3 times. Require `state` = `opened`, `detailed_merge_status` = `mergeable`, and `glab api -X GET projects/:id/merge_requests/<iid>/approvals` `approvals_left` = 0; else report the field, stop. `glab api projects/:id/merge_requests/<iid>/merge -X PUT -f sha=<head_sha>` (step 3 head; guards against new commits). Response `state` = `merged` → done; other state without error → re-fetch, report `state`, Merged: no (pending). `409` → report "new commits pushed"; `405`/`406`/`422` → report exact error line and current `detailed_merge_status`; `401` → report no merge permission. On any merge error the review and approval stay posted; stop.
12. **Resolve findings.** Per resolve-findings.md. Never change code or the posted review; per open blocker give impact, recommended fix, and who acts. Ask only for choices this skill owns (for example re-run the review after checks finish).

## Output

```text
MR: !<iid> <web_url>
Findings: <n> inline, <m> general (<b> blocking, <p> praise; both counts include praise)
Review state: requested_changes | reviewed | none
Approval: approved | not approved (<failed criteria ids> | declined) | skipped (already approved)
Reviewer added: yes | no
Threads resolved: <n> of <own unresolved>
Merged: yes | no (<error or reason>) | not offered (<blockers>) | not requested
Findings: <n> resolved, <m> open (<id: reason; recommended fix>, …), <k> accepted | none | not run (stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
