---
name: ship-changes
description: Ship current changes end to end on GitLab or GitHub, chosen from the origin host. Switch off a protected branch, commit atomic signed changes and push, open the merge request (GitLab) or pull request (GitHub) if none exists, then loop review and address rounds (up to 5) until the review has no findings other than praise. Chains cdk:switch-branch, cdk:commit-changes, then cdk:submit-merge-request, cdk:review-merge-request, and cdk:address-merge-request-review on GitLab, or cdk:prepare-pull-request, cdk:review-pull-request, and cdk:address-pull-request-review on GitHub. Use only when the user explicitly asks to ship changes, run the full MR or PR cycle, or branch, commit, open, review, and address a merge or pull request in one go. Do not use on your own after finishing a task.
argument-hint: '[optional branch hint or description]'
allowed-tools: Bash(git rev-parse *) Bash(git remote get-url *) Bash(git symbolic-ref *) Bash(git fetch --prune origin) Bash(git rev-list *) Bash(glab auth status) Bash(glab api projects/:id) Bash(glab api --paginate projects/:id/protected_branches) Bash(glab mr list *) Bash(gh auth status) Bash(gh repo view *) Bash(gh pr list *) Bash(gh api repos/{owner}/{repo}/branches/{branch} --jq .protected)
---

# Ship Changes

Input: $ARGUMENTS

## Rules

- Orchestration per `${CLAUDE_SKILL_DIR}/orchestration.md`.
- Host = `github` when `git remote get-url origin` has host `github.com`, else `gitlab`. Steps below name the host they apply to; unmarked steps run on both.
- Input = branch hint or description, passed only to `cdk:switch-branch` (callers such as `cdk:ship-spec-kit-bug` pass `fix <slug>`); `cdk:commit-changes` runs without input and groups from the diff.
- Review loop capped at 5 rounds, on both hosts.
- Never merge directly; only the review skills merge (`cdk:review-merge-request`, `cdk:review-pull-request`), each after its own confirmation.
- Chained by other skills via the Skill tool; never set `disable-model-invocation: true` (it blocks that invocation).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `ship-changes`.

## Workflow

1. **Pre-flight.** Detect the host per Rules. gitlab → steps 1–2 of `${CLAUDE_SKILL_DIR}/../submit-merge-request/gitlab.md` `## Pre-flight`; keep `default_branch`. github → steps 5–6 of `${CLAUDE_SKILL_DIR}/../prepare-pull-request/github.md` `## Pre-flight`; keep Repo, and `default_branch` = `gh repo view --json defaultBranchRef --jq .defaultBranchRef.name`.
2. **Protected check.** Current = `git rev-parse --abbrev-ref HEAD`. Protected per `${CLAUDE_SKILL_DIR}/../commit-changes/conventions.md` `## Protected branch` (incl. its fallback list, default branch, and detached `HEAD`). Protected → invoke the `cdk:switch-branch` skill via the Skill tool with `$ARGUMENTS`; `Result: nothing-to-do` → stop, `Stopped: 2: on protected branch with nothing to branch`.
3. **Commit.** Invoke the `cdk:commit-changes` skill via the Skill tool with no input. Keep its commit count, whether its `Branch:` line says pushed, and its `Excluded:` files (held-back secrets the user must see). `Result: nothing-to-do` → current = the branch after step 2's switch; `git fetch --prune origin`, then `git rev-list --count origin/<default_branch>..HEAD` = 0 → stop, report "nothing to ship"; else continue with the commits already on the branch. gitlab with `Excluded:` files → stop before step 4, `Stopped: 3: held-back files leave the tree dirty, and cdk:address-merge-request-review needs a clean tree` (github records dirty paths and continues). Commits not pushed and an MR or PR already exists (step 4) → stop, `Stopped: 4: unpushed commits; push first`, since no chained skill pushes before the review.
4. **MR or PR.**
   - gitlab: `glab mr list --source-branch <current> -F json` (re-read current branch first). Open MR found → keep iid, skip. More than one open MR → stop, list them. Else invoke the `cdk:submit-merge-request` skill via the Skill tool with `source=<current> target=<default_branch>` (presets skip its branch question); keep the created iid. Its `Result: nothing-to-do` (no changes vs target) → stop, report "nothing to ship", `Result: nothing-to-do`.
   - github: `gh pr list --head <current> --state open --json number,url,headRepositoryOwner` (re-read current branch first), keeping heads owned by Repo's owner. One found → keep its number, skip. Else invoke the `cdk:prepare-pull-request` skill via the Skill tool with `--target <default_branch>` (presets skip its target question); keep the number from its `PR:` line. Its `Result: nothing-to-do` → stop, report "nothing to ship", `Result: nothing-to-do`; `stopped` (e.g. gating findings) → `Stopped: 4: <its Stopped>`.
5. **Review loop.** Round = 1..5:
   1. gitlab: invoke the `cdk:review-merge-request` skill via the Skill tool with `<iid>`. github: invoke the `cdk:review-pull-request` skill via the Skill tool with `<n>`.
   2. gitlab: read its Output `Findings: <n> inline, <m> general (<b> blocking, <p> praise)` and `Threads resolved: <r> of <o>` (own unresolved threads). `Merged: yes`, or `n + m − p` = 0 and `o − r` = 0 → exit loop; else continue (own threads still open count as findings). github: read `Findings: <b> blocking, <s> suggestions, …` and `Comments:`. Its `Merged: yes`, `Findings: none`, or `b + s` = 0 → exit loop. `Comments: prepared, not posted` (the user declined to post) → exit loop, list the findings as open; the address step has nothing to collect.
   3. gitlab: invoke the `cdk:address-merge-request-review` skill via the Skill tool with `<iid> self-review` (keeps threads self opened in sub-step 1, the review). github: invoke the `cdk:address-pull-request-review` skill via the Skill tool with `<n> self-review`. `Result: nothing-to-do` → exit loop, report remaining findings as open.
      Any chained `Result: stopped | cancelled` in sub-steps 1 or 3 → `Stopped: 5: <its Stopped>`; a review `Result: nothing-to-do` (no open MR or PR) → exit loop, report "nothing to review".
   4. The address Output shows `Commits: none` or `Pushed: no` → exit loop, list the findings as open (a repeat review would see the same head).
   5. Round 5 done with findings or own threads left → exit loop, list them as open; `Last review` is that round's review, before its fixes.

## Output

```text
Host: gitlab | github
Branch: <name> (switched: yes | no)
Commits: <count> new (pushed | not pushed) | none
Excluded: <files> | none
MR: !<iid> <web_url> (created | existing) | PR: #<n> <url> (created | existing)
Rounds: <r> of 5
Last review: gitlab: <n> inline, <m> general (<b> blocking, <p> praise) | github: <b> blocking, <s> suggestions
Merged: yes | no (<reason>)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```

`done` includes a loop that exits with findings left open (listed under `Merged: no (<reason>)`); `stopped` is a step failure or the stops above.
