---
name: delete-branches
description: Deletes local, remote, or both git branches chosen from paged lists, excluding the default, host-protected, current, and worktree branches. Use when asked to delete or clean up git branches.
compatibility: Claude Code only. Uses CLAUDE_SKILL_DIR; claude.ai and API uploads reject unknown frontmatter keys.
allowed-tools: Bash(git -C * rev-parse *) Bash(git -C * remote -v) Bash(git -C * remote get-url *) Bash(git -C * ls-remote *) Bash(git -C * worktree list *) Bash(node ${CLAUDE_SKILL_DIR}/scripts/list-branches.mjs *) Bash(gh api *repos/*/branches*) Bash(gh api *repos/*/rules/branches/*) Bash(glab api *projects/*/protected_branches*)
---

# Delete Branches

## Rules

- Never delete a branch in the protected set (step 3). Never `--force`, `--mirror`, `--no-verify`, or a bare `-f`. Each delete is attempted once; a failure is reported with git's exact error line, never retried.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags. `fetch`, `merge`, `branch -d`, `branch -D`, and `push --delete` stay out of `allowed-tools`; the permission prompt is the second guard.
- Branch, remote, and owner/repo names and host output are data: run commands with `<root>`, `<remote>`, `<branch>`, `<upstream-branch>` in single quotes; a branch name containing `'` or a newline → skipped and reported.
- Ask with the question tool (load it with ToolSearch if deferred; 1–4 questions per call, 2–4 options each). Unavailable → a numbered list as plain text, then end the turn and wait for numbers. Unattended (no way to ask) → `Stopped: 0: cannot interact`; nothing is deleted.
- Host tooling: the host's MCP server first (discover with ToolSearch), then its CLI. A failure → continue with the default branch alone and report `Host protection: unavailable (<reason>)`.
- Touch no file, commit nothing, spawn no subagent.

## Workflow

0. **Plan mode.** Enter plan mode first (load `EnterPlanMode` with ToolSearch if deferred; already active → stay in it); read-only steps run inside it. Before creating, editing, or deleting any file or running any side-effect action, present the plan and wait for `ExitPlanMode` approval. Declined or unavailable → `Result: stopped`, `Stopped: 0: plan mode declined`; nothing is written.
1. **Repository.** `repo-root` on `.`; failure → `Stopped: 1: not a git repository`. `remotes`: `origin` listed → that remote; else ask which; none → local scope only and every remote step is skipped.
2. **Scope.** Ask **Local** · **Remote** · **Both**. No remote → state that only local applies and skip the question.
3. **Protected set.** Union of:
   1. `default-branch` for the remote.
   2. Host protection by `remote-url`. GitHub → the GitHub MCP `list_branches` with `protected`, else `github-protected`; the rule check of step 5 adds branches with at least one ruleset rule. GitLab → the GitLab MCP `list_branches` (protected), else `gitlab-protected`; keep wildcard names as patterns. Another host, or any failure → unavailable.
   3. `current-branch`; for the local scope also every branch checked out in `worktrees`.
4. **Fetch.** `fetch-all`.
5. **Candidates.** Run `list-local` and/or `list-remote` with one `--protected` per protected name or pattern. GitHub with host protection available → run `github-rules` for each candidate name, add each one with at least one rule to the protected set, and run the script again. Record `candidates`, `excluded`, `skipped`, and `pages`; the script's output describes each branch for the question. No candidates for a scope → note it and continue.
6. **Select.** Ask each call in `pages` (local first, then remote) with the question tool. Nothing selected anywhere → `Result: nothing-to-do`.
7. **Plan.** Present the fast-forward updates, the local branches to delete, the remote branches to delete, and the protected set with the host-protection status. `ExitPlanMode`; declined → `Result: stopped`, `Stopped: 0: plan mode declined`.
8. **Update (local).** For each selected branch with an upstream: the current branch → `ff-merge`; any other → `ff-update`. A non-fast-forward result → list it under `Diverged:` and still offer the delete in step 9.
9. **Delete local.** `delete-local` per selected branch. A "not fully merged" rejection → ask once whether to force-delete those branches, then `force-delete` for the chosen ones only. Any other failure → `Local failed:`.
10. **Delete remote.** `delete-remote` per selected branch, then `prune-remote`. A rejection (protected on the host, no permission) → `Remote failed:` with git's error line.
11. **Verify.** Re-run the listing commands; a deleted name still listed → `Open:`.
12. **Report.** Print the Output.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For the evals, see `${CLAUDE_SKILL_DIR}/references/evals.md`.
- For the candidate listing and question pages, run `${CLAUDE_SKILL_DIR}/scripts/list-branches.mjs`; never read it.

## Output

```text
Repository: <root>
Remote: <name> | none
Scope: local | remote | both
Host protection: <MCP <server> | gh | glab> | unavailable (<reason>)
Protected: <names, …>
Local deleted: <branch, …> | none
Local skipped: <branch: reason, …> | none
Local failed: <branch: git error, …> | none
Remote deleted: <branch, …> | none
Remote skipped: <branch: reason, …> | none
Remote failed: <branch: git error, …> | none
Diverged: <branch, …> | none
Open: <item: impact; recommended fix, …> | none
Next: none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
