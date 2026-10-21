# Flow details

Commands run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`.

## Contents

- Pre-flight · Resume detection · Branch · Review loop · Sync target · Blockers · Open items

## Pre-flight

Context → Git, Node, and npx version present (not `<none>`), plus `gh-version` (GitHub) or `glab-version` (GitLab); Context → Repo root present. No merge, rebase, cherry-pick, or detached `HEAD` in progress (look for `MERGE_HEAD`, `rebase-merge`, `rebase-apply`, `CHERRY_PICK_HEAD` under `git-dir-state`). Auth ok (`gh-auth` or `glab-auth`).

- Signing: `signing-key` set; `signing-format` = `ssh` also needs `signers-file` set and existing. Missing → blocker `signing` (not a stop); never edit the signing config.
- Target: `--target`, else `.claude/release-policy.json` `defaultBranch`, else `default-branch` without `origin/`. Then `fetch`.
- Any failure so far → blocker. A pre-flight stop prints `Open: pre-flight: <reason>` and ends the run.

## Resume detection

Current = Context → Branch; its PR or MR = the open one (`gh-pr-list`, or `glab-mr-list`), else the latest.

- Merged and its head equals `HEAD` (or `origin/<target>..HEAD` is empty) → step 9.
- On the target, clean, and `unshipped-count` = 0 → "nothing to ship", `Result: nothing-to-do`, step 9.
- Open PR or MR with a clean tree → step 5 (steps 3 and 4 have nothing to do).
- Merged but its head differs from `HEAD`, or closed unmerged → not this release: treat the branch as new, ignore that PR or MR, continue at step 3.

## Branch

Switch when `HEAD` is the target, the default branch, or protected, and there are changes (dirty tree, or `unshipped-count` > 0).

- Protected: GitHub `protected-branch` = `true`; `glab` or the API unavailable, or any API error → `main`, `master`, `develop`, `release/*`.
- Invoke `cdk:switch-branch`; step 9 reconciles local `<target>` afterwards.

## Review loop

Up to 3 rounds. A round = one review plus its fix cycle, so the third round ends with a final review and no fix.

1. **Review.** Invoke `cdk:review-change-request <n> --yes --squash <yes|no> --delete-branch <yes|no>`. Round 1 adds `--reuse-findings <Findings file from step 7>` (reused only when its head SHA equals the PR or MR head); later rounds never pass it. It posts one review with labeled inline comments and merges a clean PR or MR; read `Merged:` from its Output.
2. **Merged** → step 9.
3. **Pending required checks** → GitHub `checks-poll` (exit 8 = pending), GitLab `glab-mr-view` and read `head_pipeline`; `poll-wait` then repeat until done, bounded by elapsed time (10-minute cap per wait, never `--watch`); `checks-poll` exiting non-zero with "no required checks" means none are required, not failure; at most 2 waits, then repeat 1 once. Still pending → blocker `checks pending`, leave the loop. A wait does not use a round.
4. **Blockers or open items** (a `(blocking)` comment, failing checks, other open findings) → invoke `cdk:address-change-request-review <n> --self-review --yes`, then step 5 again, then the next round. Needs a person (approval from someone else, conflicts, draft, branch policy) → blocker, leave the loop.
5. Third review with items left → blocker `review rounds`, leave the loop.

Approved = no `(blocking)` comment and required checks passing on an own PR (GitHub rejects self `APPROVE`/`REQUEST_CHANGES`, so the review is `COMMENT`); otherwise `reviewDecision` `APPROVED`. GitLab approves for real when the project allows author approval.

## Sync target

`switch-target`, `fetch`, `ff-target`. A dirty tree is a blocker; never reset. A non-fast-forward is allowed only when every extra local `<target>` commit is in the merged PR or MR (`is-ancestor` succeeds, also after a squash merge): report `Main: <target> not fast-forwarded (local pre-release commits are in the merged PR or MR)`; this does not make `Release` unmet. A skipped sync leaves local `<target>` as is.

## Blockers

Blockers are reported, never asked. A blocked step does not end the run: run every step that does not depend on it and is still safe.

1. **Investigate.** Read the failing command's exact output; auto memory and `.claude/rules/`; CI logs (`run-list` then `run-failed-log`, or `glab-ci-log`); the chained skill's `Stopped:`, `Blocked:`, and `Open:` lines. Write the root cause, or `unknown` with what was ruled out.
2. **Resolve safely.** At most 2 attempts per blocker. Allowed: re-run after a transient error, run a missing documented step, fix code or config through the chained skills, re-run a chained skill with corrected input. Never: `--no-verify`, `--admin`, force-push, `git reset --hard`, editing the release policy or a check to make it pass, skipping a test or required check, counting someone's approval as given.
3. **Record when unresolved.** One `Blockers:` entry: step, blocker, root cause, attempts, impact, recommended follow-up (who acts).
4. **Continue** per the table; list each skipped step with its blocker.

   | Blocked step                                               | Skipped (dependent)            | Still runs                                     |
   | ---------------------------------------------------------- | ------------------------------ | ---------------------------------------------- |
   | Pre-flight (not git, no CLI or auth)                       | everything                     | report                                         |
   | Signing missing                                            | commit onward                  | release files (left uncommitted), report       |
   | Switch or commit failure                                   | release files, PR or MR onward | report                                         |
   | Release files failure                                      | PR or MR onward                | report                                         |
   | PR or MR create failure                                    | review, merge                  | target sync (only when already merged), report |
   | Review findings, failing or pending checks, needs a person | merge, target sync             | report                                         |
   | Target sync failure                                        | none                           | report                                         |

5. **Honest result.** `Release: shipped` only when the commits are pushed, the PR or MR is merged with required checks passing, and the target is synced or held back only by pre-release commits already in the merge. Any unmet critical requirement gives `Result: stopped` and `Stopped: <first blocked step>: <reason>`, even though later independent steps ran.

## Open items

List in `Open:`, each with impact and recommended fix, and change nothing: every `Blockers:` entry, `Release: not shipped`, a `Steps:` entry marked incomplete, `Main: not synced`, `Merged: no (<reasons>)`, and open `Open:` or `Resolution:` lines of the chained skills. Nothing → `Open: none`.
