---
name: ship-merge-request
description: Ship current changes end to end on GitLab. Switch off a protected branch, commit atomic signed changes and push, open the merge request if none exists, then loop review and address rounds (up to 5) until the review has no findings other than praise. Chains cdk:switch-branch, cdk:commit-changes, cdk:submit-merge-request, cdk:review-merge-request, and cdk:address-merge-request-review. Use only when the user explicitly asks to ship changes, run the full MR cycle, or branch, commit, open, review, and address an MR in one go. Do not use on your own after finishing a task.
argument-hint: '[optional branch hint or description]'
allowed-tools: Bash(git rev-parse *) Bash(git remote get-url *) Bash(git symbolic-ref *) Bash(git fetch --prune origin) Bash(git rev-list *) Bash(glab auth status) Bash(glab api projects/:id) Bash(glab api --paginate projects/:id/protected_branches) Bash(glab mr list *)
---

# Ship Merge Request

Input: $ARGUMENTS

## Rules

- Orchestration per `${CLAUDE_SKILL_DIR}/orchestration.md`.
- Input = branch hint or description, passed only to `cdk:switch-branch` (callers such as `cdk:ship-spec-kit-bug` pass `fix <slug>`); `cdk:commit-changes` runs without input and groups from the diff.
- Review loop capped at 5 rounds.
- Chained by other skills via the Skill tool; never set `disable-model-invocation: true` (it blocks that invocation).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `ship-merge-request`.

## Workflow

1. **Pre-flight.** Steps 1–2 of `${CLAUDE_SKILL_DIR}/../submit-merge-request/gitlab.md` `## Pre-flight`; keep `default_branch`.
2. **Protected check.** Current = `git rev-parse --abbrev-ref HEAD`. Protected per `${CLAUDE_SKILL_DIR}/../commit-changes/conventions.md` `## Protected branch` (incl. its fallback list, default branch, and detached `HEAD`). Protected → invoke `cdk:switch-branch` with `$ARGUMENTS`; `Result: nothing-to-do` → stop, `Stopped: 2: on protected branch with nothing to branch`.
3. **Commit.** Invoke `cdk:commit-changes` with no input. Keep its commit count, whether its `Branch:` line says pushed, and its `Excluded:` files (held-back secrets the user must see). `Result: nothing-to-do` and current branch not protected (step 2 rule) → `git fetch --prune origin`; `git rev-list --count origin/<default_branch>..HEAD` = 0 → stop, report "nothing to ship"; else continue with the commits already on the branch. `nothing-to-do` on a protected branch → stop, report "nothing to ship".
4. **MR.** `glab mr list --source-branch <current> -F json` (re-read current branch first). Open MR found → keep iid, skip. Else invoke `cdk:submit-merge-request` with `source=<current> target=<default_branch>` (presets skip its branch question); keep the created iid. Its `Result: nothing-to-do` (no changes vs target) → stop, report "nothing to ship", `Result: nothing-to-do`.
5. **Review loop.** Round = 1..5:
   1. Invoke `cdk:review-merge-request` with `<iid>`.
   2. Read its Output `Findings: <n> inline, <m> general (<b> blocking, <p> praise)` and `Threads resolved: <r> of <o>` (own unresolved threads). `Merged: yes`, or `n + m − p` = 0 and `o − r` = 0 → exit loop; else continue (own threads still open count as findings).
   3. Invoke `cdk:address-merge-request-review` with `<iid> self-review` (keeps threads self opened in sub-step 1, the review). `Result: nothing-to-do` → exit loop, report remaining findings as open.
   4. Round 5 done with findings or own threads left → exit loop, list them as open.

## Output

```text
Branch: <name> (switched: yes | no)
Commits: <count> new (pushed | not pushed) | none
Excluded: <files> | none
MR: !<iid> <web_url> (created | existing)
Rounds: <r> of 5
Last review: <n> inline, <m> general (<b> blocking, <p> praise)
Merged: yes | no (<reason>)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
