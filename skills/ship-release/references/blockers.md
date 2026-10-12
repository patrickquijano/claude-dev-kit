# Blockers

Applies to every step; blockers are reported, never asked. A blocked step does not end the run: run every step that does not depend on it and is still safe. Commands run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`.

1. **Investigate.** In order: the failing command's exact output; the known-issues store per known-issues.md (slug `ship-release`), auto memory, and `.claude/rules/`; CI logs (`run-list` then `run-failed-log`, or `glab-ci-log`); the chained skill's `Stopped:`, `Blocked:`, and `Resolution:` lines; for an external tool or host error, the official docs via `cdk:topic-researcher` (cited sources). Write down the root cause, or `unknown` with what was ruled out.
2. **Resolve safely.** At most 2 attempts per blocker, each backed by evidence.
   - Allowed: re-run after a transient error, run a missing documented step, fix code or config in the working tree through the chained skills, re-run a chained skill with corrected input.
   - Never: `--no-verify`, `--admin`, force-push, `git reset --hard`, editing the release policy or a check to make it pass, skipping or weakening a test or required check, treating a person's approval or review as satisfied.
3. **Record when unresolved.** One `Blockers:` entry: step, blocker, root cause, research (sources checked), attempts (what was tried and the result), impact, recommended follow-up (who acts).
4. **Continue** per the table. List each skipped step with the blocker it depends on.

   | Blocked step                                               | Skipped (dependent)            | Still runs                                     |
   | ---------------------------------------------------------- | ------------------------------ | ---------------------------------------------- |
   | Pre-flight (not git, no CLI or auth)                       | everything                     | report                                         |
   | Signing missing                                            | commit onward                  | release files (left uncommitted), report       |
   | Switch or commit failure                                   | release files, PR or MR onward | report                                         |
   | Release files failure                                      | PR or MR onward                | report                                         |
   | PR or MR create failure                                    | review, merge                  | target sync (only when already merged), report |
   | Review findings, failing or pending checks, needs a person | merge, target sync             | report                                         |
   | Target sync failure                                        | none                           | report                                         |

5. **Honest result.** `Release: shipped` only when the commits are pushed, the PR or MR is merged with required checks passing, and the target is synced or only held back by pre-release commits already in the merge. Any unmet critical requirement gives `Result: stopped` and `Stopped: <first blocked step>: <reason>` even though later independent steps ran.
