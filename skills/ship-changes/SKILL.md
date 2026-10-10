---
name: ship-changes
description: Ship current changes end to end on GitLab or GitHub, chosen from the origin host. Switch off a protected branch, commit atomic signed changes and push, open the merge request (GitLab) or pull request (GitHub) if none exists, loop review and address rounds (up to 5), and merge a clean, approved, conflict-free change whose required checks pass. Asks once for the target branch, squash, and source-branch deletion (plus one optional another-loop question), then reuses them; asks nothing before switching, committing, posting, or merging. Chains cdk:switch-branch, cdk:commit-changes, then cdk:prepare-merge-request, cdk:review-merge-request, and cdk:address-merge-request-review on GitLab, or cdk:prepare-pull-request, cdk:review-pull-request, and cdk:address-pull-request-review on GitHub. Use only when the user explicitly asks to ship changes, run the full MR or PR cycle, or branch, commit, open, review, and address a merge or pull request in one go. Do not use on your own after finishing a task.
argument-hint: '[optional branch hint or description]'
allowed-tools: Bash(git rev-parse *) Bash(git remote get-url *) Bash(git symbolic-ref *) Bash(git fetch --prune origin) Bash(git for-each-ref *) Bash(git rev-list *) Bash(glab auth status) Bash(glab api projects/:id) Bash(glab api --paginate projects/:id/protected_branches) Bash(glab mr list *) Bash(gh auth status) Bash(gh repo view *) Bash(gh pr list *) Bash(gh api repos/{owner}/{repo}/branches/{branch} --jq .protected)
---

# Ship Changes

Input: $ARGUMENTS

## Rules

- Orchestration per `${CLAUDE_SKILL_DIR}/orchestration.md`.
- Host = `github` when `git remote get-url origin` has host `github.com`, else `gitlab`. Steps below name the host they apply to; unmarked steps run on both.
- Input = branch hint or description, passed only to `cdk:switch-branch` (callers such as `cdk:ship-spec-kit-bug` pass `fix <slug>`); `cdk:commit-changes` runs without input and groups from the diff.
- Two asks in the whole run: the step 4 Settings (target, squash, delete source branch; asked once, then reused by every chained skill and every extra loop) and the step 7 Next loop. Never ask before switching off a protected branch, committing, pushing, creating or updating the MR or PR, posting reviews, comments, or replies, resolving threads, or merging; the Settings answer is the consent for all of them, and permission prompts stay the second guard. The chained skills may still ask a material question (ambiguous or conflicting feedback) or stop on their own conditions.
- Merge only inside the review skills (`cdk:review-merge-request`, `cdk:review-pull-request`), in their `auto` mode with the Settings, and only when the MR or PR is clean: not draft, conflict-free, approval requirements met, every required check passing. Otherwise no merge; report every blocker.
- Small, low-risk changes are reviewed directly by `cdk:prepare-pull-request` and `cdk:review-pull-request` with no reviewer subagents (`prepare-pull-request/findings.md` `## Direct review`); subagents run only when size, risk, or specialty justifies them.
- Caps: 5 review rounds per loop and 3 extra loops end `done` with the open items listed; 3 invalid typed-target re-asks (step 4) → `Stopped: 4: no valid target`.
- Chained by other skills via the Skill tool; never set `disable-model-invocation: true` (it blocks that invocation).
- AskUserQuestion unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/fallbacks.md`.
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `ship-changes`.

## Workflow

1. **Pre-flight.** Detect the host per Rules. gitlab → steps 1–2 of `${CLAUDE_SKILL_DIR}/../prepare-merge-request/gitlab.md` `## Pre-flight`; keep `default_branch`, `squash_option`, `remove_source_branch_after_merge`. github → steps 5–6 of `${CLAUDE_SKILL_DIR}/../prepare-pull-request/github.md` `## Pre-flight`; keep Repo, and `gh repo view --json defaultBranchRef,squashMergeAllowed,mergeCommitAllowed,deleteBranchOnMerge` (`default_branch` = `defaultBranchRef.name`).
2. **Protected check.** Current = `git rev-parse --abbrev-ref HEAD`. Protected per `${CLAUDE_SKILL_DIR}/../commit-changes/conventions.md` `## Protected branch` (incl. its fallback list, default branch, and detached `HEAD`). Protected → `git status --porcelain` empty and no commits to ship (`origin/<default_branch>..HEAD` = 0) → stop, report "nothing to ship", `Result: nothing-to-do`; else invoke the `cdk:switch-branch` skill via the Skill tool with `$ARGUMENTS` immediately, no ask (it carries the branch hint; `cdk:commit-changes` would switch without one); `Result: nothing-to-do` → stop, `Stopped: 2: on protected branch with nothing to branch`.
3. **Commit.** Invoke the `cdk:commit-changes` skill via the Skill tool with no input. Keep its commit count (the `Commits:` lines), whether its `Branch:` line says pushed, and its `Excluded:` files (held-back secrets the user must see). `Result: nothing-to-do` → current = the branch after step 2's switch; `git fetch --prune origin`, then `git rev-list --count origin/<default_branch>..HEAD` = 0 → stop, report "nothing to ship"; else continue with the commits already on the branch. gitlab with `Excluded:` files → stop before step 4, `Stopped: 3: held-back files leave the tree dirty, and cdk:address-merge-request-review needs a clean tree` (github records dirty paths and continues).
4. **Settings.** Re-read current. Existing open MR or PR for it: gitlab `glab mr list --source-branch <current> -F json`; github `gh pr list --head <current> --state open --json number,url,headRepositoryOwner,baseRefName`, keeping heads owned by Repo's owner. One found → keep its iid or number and take its base branch as Target, no target question; more than one → stop, list them. github with an existing PR and `git rev-list --count @{u}..HEAD` > 0 (or no upstream) → stop, `Stopped: 4: unpushed commits; push first`, since `cdk:prepare-pull-request` is skipped and no chained skill pushes before the review (gitlab: `cdk:prepare-merge-request` pushes). Else `git fetch --prune origin`, `git for-each-ref --sort=-committerdate --format='%(refname:short)' refs/remotes/origin`, drop `origin/HEAD`, `origin`, and current. One AskUserQuestion, up to three questions, asked now and never again this run:
   - Target (only without an existing MR or PR): the four most recent branches, `<default_branch>` first "(Recommended)" when listed; Other must be a listed branch (3 re-asks).
   - Squash: skipped when enforced (gitlab `squash_option` `always` or `never`; github only one of squash or merge commit allowed) and noted. Options `Squash into one commit` | `Keep commits`; recommended = gitlab `squash_option` `default_on`, github squash allowed.
   - Delete source branch: `Delete source branch after merge` | `Keep branch`; recommended = gitlab `remove_source_branch_after_merge`, github `deleteBranchOnMerge`.
     Keep Settings = target, squash (`yes | no | enforced`), delete (`yes | no`).
5. **MR or PR.**
   - gitlab: invoke the `cdk:prepare-merge-request` skill via the Skill tool with `source=<current> target=<target> squash=<yes|no> delete-source=<yes|no> auto` (presets skip its questions; on an existing MR it refreshes merge options and pushes, keeping title and description unless the title fails the rules); omit `squash=` when enforced. Keep the iid. Its `Result: nothing-to-do` (no changes vs target) → stop, report "nothing to ship", `Result: nothing-to-do`.
   - github: existing PR from step 4 → keep its number, skip. Else invoke the `cdk:prepare-pull-request` skill via the Skill tool with `--target <target> --yes`; keep the number from its `PR:` line. Its `Result: nothing-to-do` → stop, report "nothing to ship", `Result: nothing-to-do`; `stopped` (e.g. gating findings) → `Stopped: 5: <its Stopped>`.
6. **Review loop.** Round = 1..5:
   1. gitlab: invoke the `cdk:review-merge-request` skill via the Skill tool with `<iid> auto`. github: invoke the `cdk:review-pull-request` skill via the Skill tool with `<n> --auto --squash <yes|no> --delete-branch <yes|no>` (omit `--squash` when enforced; omit `--delete-branch` for a fork PR).
   2. gitlab: read its Output `Findings: <n> inline, <m> general (<b> blocking, <p> praise)` and `Threads resolved: <r> of <o>` (own unresolved threads). `Merged: yes`, or `n + m − p` = 0 (`n`, `m` include praise) and `o − r` = 0 → exit loop; else continue (own threads still open count as findings). github: read `Findings: <b> blocking, <s> suggestions, …` and `Comments:`. Its `Merged: yes`, `Findings: none`, or `b + s` = 0 → exit loop. `Comments: prepared, not posted` → exit loop, list the findings as open; the address step has nothing to collect. Exit with `Merged:` `not offered (<blockers>)` → keep the blockers for the Output.
   3. gitlab: invoke the `cdk:address-merge-request-review` skill via the Skill tool with `<iid> self-review` (keeps threads self opened in sub-step 1, the review). github: invoke the `cdk:address-pull-request-review` skill via the Skill tool with `<n> self-review --yes`. `Result: nothing-to-do` → exit loop, report remaining findings as open.
      Any chained `Result: stopped | cancelled` in sub-steps 1 or 3 → `Stopped: 6: <its Stopped>`; a review `Result: nothing-to-do` (no open MR or PR) → exit loop, report "nothing to review".
   4. The address Output shows `Commits: none` or `Pushed: no` → exit loop, list the findings as open (a repeat review would see the same head).
   5. Round 5 done with findings or own threads left → exit loop (not `stopped`), list them as open; `Last review` is that round's review, before its fixes.
7. **Next loop.** `Merged: yes` or a stop or nothing-to-do exit → skip. Otherwise decide whether another loop may help: open findings, open own threads, or blockers a new round could clear (checks still pending, a failed check, an unknown merge state). Only blockers that need a person (another reviewer's required approval, merge conflicts, draft, branch policy) → skip, report them. Another loop may help → one AskUserQuestion: `Run another loop` (Recommended) | `Stop`. Run → back to step 6 with the same Settings and no other question (cap in Rules; `Loops` counts it); after the third extra loop skip the ask and report what is open. Stop → end.

## Output

```text
Host: gitlab | github
Branch: <name> (switched: yes | no)
Commits: <count> new (pushed | not pushed) | none
Excluded: <files> | none
MR: !<iid> <web_url> (created | existing) | PR: #<n> <url> (created | existing)
Settings: target <branch>, squash <yes | no | enforced>, delete source <yes | no>
Loops: <l> (rounds <r> of 5 in the last)
Last review: gitlab: <n> inline, <m> general (<b> blocking, <p> praise) | github: <b> blocking, <s> suggestions
Merged: yes (<squash | merge commit>; branch <deleted | kept>) | no (<every blocker or open finding>)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```

`done` includes a loop that exits with findings or blockers left open (listed under `Merged: no (<reason>)`) and a user `Stop` at step 7; `stopped` is a step failure or the stops above.
