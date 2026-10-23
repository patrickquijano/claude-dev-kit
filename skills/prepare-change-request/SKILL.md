---
name: prepare-change-request
description: Reviews a branch with parallel reviewers, then creates or updates a GitHub PR or GitLab MR with a filled template. Use only when the user explicitly asks to prepare, open, or update a PR or MR.
argument-hint: '[--target <branch>] [--template <name|path>] [--draft] [--dry-run] [--yes] [--gate report] [--squash <yes|no>] [--delete-branch <yes|no>]'
allowed-tools: Bash(git rev-parse *) Bash(git status *) Bash(git remote) Bash(git remote get-url *) Bash(git fetch --all --prune) Bash(git fetch --prune origin) Bash(git for-each-ref *) Bash(git symbolic-ref --short refs/remotes/origin/HEAD) Bash(git merge-base *) Bash(git rev-list *) Bash(git log *) Bash(git diff *) Bash(git show *) Bash(git ls-files *) Bash(mktemp *) Bash(gh auth status) Bash(gh repo view *) Bash(gh api user --jq .login) Bash(gh pr list *) Bash(gh pr view *) Bash(glab auth status) Bash(glab api user) Bash(glab api projects/:id) Bash(glab api projects/:id/templates/merge_requests) Bash(glab mr list *) mcp__plugin_github_github__get_me mcp__plugin_github_github__list_pull_requests mcp__plugin_github_github__pull_request_read mcp__plugin_gitlab_gitlab__get_user mcp__plugin_gitlab_gitlab__get_project mcp__plugin_gitlab_gitlab__list_merge_requests mcp__plugin_gitlab_gitlab__get_merge_request
---

# Prepare Change Request

Input: $ARGUMENTS

A change request (CR) is a GitHub pull request or a GitLab merge request.

## Context

- Origin: !`git remote get-url origin 2>/dev/null || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `commands.md` row.

## Rules

- Rigor: never guess or invent: confirm each path, command, and fact by reading it; ask (unattended: record) what the input and repo cannot answer. Finish every step in full, think twice before each irreversible step, and re-check the result against these rules and the repo's standards before reporting.
- Efficiency: read only what a step needs, keep output terse, and take the fewest steps that meet the goal; when work is autonomous and splits cleanly, spawn independent cdk subagents in one parallel turn (`cdk:task-worker` for read-only work, `cdk:plan-implementer` for edits), never `Explore` or `general-purpose`; each spawn gets a complete brief (agent, kind, literal inputs, scope, return block; missing or ambiguous → `Question:`, never assume).
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Host ops: call the host file's MCP tool first; server not connected, error, or `—` → run the command unchanged. Writes keep their confirmation gates.
- Only this skill asks the user; subagents cannot. Missing or ambiguous state, template, check result, or CR identity → stop with the reason. AskUserQuestion or Write unavailable → ask the pending question as plain text with its options and end the turn.
- Host from Context → Origin: `github.com` → GitHub (`gh`, `${CLAUDE_SKILL_DIR}/references/github.md`); any other host → GitLab (`glab`, `${CLAUDE_SKILL_DIR}/references/gitlab.md`).
- Review only the committed range `merge-base..HEAD`; uncommitted changes are out of scope.
- Target: `--target <branch>`, else the host's default branch; ask only when none is found; unattended → `Stopped: 4: no target`.
- Writes (`git push`, CR create and update, draft flag, GitLab merge options) happen only in step 13, after the step 12 confirmation or with `--yes`; the release gate's chained `cdk:commit-changes` also pushes under the gate's own consent. None is in `allowed-tools`.
- `--yes` (set by `cdk:ship-release` and `cdk:scan-vulnerabilities`) skips only the consent asks: step 12 and the release gate's ask. It never skips a stop or the gate itself, and skips the step 7 gate only with `--gate report` (valid only with `--yes`): gating findings go to the managed section and `Open:`. `--dry-run` runs steps 1–12, prints the result, and writes nothing.
- Reviewers: a small, low-risk change per `${CLAUDE_SKILL_DIR}/references/findings.md` `## Direct review` is reviewed here with no reviewer subagents; otherwise five `cdk:cr-reviewer` runs, one per role (`correctness`, `tests`, `security`, `maintainability`, `docs`), read-only. Parse, validate, deduplicate, and gate per `findings.md` `## Parent validation`.
- CR title: Conventional Commits, max 72 chars, imperative, no attribution (`${CLAUDE_SKILL_DIR}/references/conventions.md`); a repo commitlint config wins and is checked with `commitlint` (not installed → `skipped (not installed)`; no config → `n/a`). Body claims come only from commits, the diff, and reviewer evidence; unknown → keep the template placeholder.
- Existing CR: change only the managed section and, when chosen, the title; keep every other byte of the body, assignees, and reviewers. Body goes through `<scratch>/body.md`, never inline shell args. Assignee = Self; reviewers none on create, kept on update.
- Merge options: `--squash` and `--delete-branch` preset them; GitLab sets them via the API, GitHub leaves them to the merge step (`chosen at review`).
- Release gate: step 5 runs `${CLAUDE_SKILL_DIR}/references/release-gate.md`, chaining `cdk:bump-version` (check-only), `cdk:update-changelog`, and `cdk:commit-changes` through the Skill tool in this thread. A version bump always needs the user's confirmation; `--yes` and `auto` never skip it. A gate stop ends the run.
- Caps: Other target 3 re-asks; reviewer respawn on a malformed return 1; analyzer respawn after `Questions` 1; title redrafts 3; Revise 5 rounds; failed push, create, or update retried once; release gate 2 rounds. Cap hit → report and print the Output with `Result: stopped`.
- Never `--force`, `--no-verify`, stash, or reset; never commit directly. Never clear reviewers or assignees silently.
- Unattended (`--yes`, chained): ask nothing beyond the gate's version confirmation; report leftovers in `Open:`.

## Workflow

1. **Args.** Parse `$ARGUMENTS`. Unknown flag, missing value, value outside `yes|no` (or `--gate` outside `report`), or `--gate report` without `--yes` → stop.
2. **Pre-flight.** Detect the host and run the host file's checks; protected branch → stop (`flow.md` `## Pre-flight`).
3. **Remote branches.** Host file `## Remote branches`; keep the list and the default.
4. **Target.** Resolve and name the target ref (`flow.md` `## Target`).
5. **Range.** Merge base, nothing-to-do exit, release gate, scratch files, push need (`flow.md` `## Range`, `release-gate.md`).
6. **Review.** Direct review when small, else five parallel reviewers (below); aggregate and print findings, write `<scratch>/findings.md` with first line `Head: <HEAD SHA>`.
7. **Gate.** Any gating finding or failed required check → print, `Result: stopped`, `Stopped: 7: <reason>` (also under `--dry-run`); with `--gate report`, continue (`Gate: reported`).
8. **Existing CR.** Host file `## Identity`: 0 → create, 1 → update, more → stop.
9. **Template.** Resolve the template and its source (`flow.md` `## Template`).
10. **Draft.** Title via `cdk:change-analyzer`, then the managed block and `<scratch>/title`, `<scratch>/body.md` (`flow.md` `## Draft`).
11. **Options.** Assignee Self; reviewers none on create, current on update; merge options per the host file `## Write`.
12. **Confirm.** Show title, branches, template, assignee, reviewers, draft, merge options, push need, body. `--dry-run` → print as result, `Result: done`, end (`flow.md` `## Confirm`).
13. **Write.** Only the confirmed effects per the host file `## Write`: push, create or update, draft flag, merge options. Failure → report the error line, retry once.
14. **Verify.** Host file `## Verify`; mismatch → report the field, `Stopped: 14: <field mismatch>`.
15. **Report.** List `Open:` per `flow.md` `## Open items`; print the Output.

Step 6 spawns, in one message, five parallel `cdk:cr-reviewer` Agent calls, one per role (`correctness`, `tests`, `security`, `maintainability`, `docs`), with `model: opus` on `correctness` and `security`. Each gets `role:`, `root:`, `base:` (`<target ref>`), `merge-base:` (`<mb>`), `head:` (HEAD SHA), and `diff:`, `name-status:`, `log:` (the three scratch paths). Briefs: `${CLAUDE_SKILL_DIR}/references/flow.md` `## Spawn briefs`.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For pre-flight, target, range, template, draft, confirm, and open items, see `${CLAUDE_SKILL_DIR}/references/flow.md`.
- For the changelog and version check before creating the CR, see `${CLAUDE_SKILL_DIR}/references/release-gate.md`.
- For the reviewer return block, validation, and direct review, see `${CLAUDE_SKILL_DIR}/references/findings.md`.
- For the title rules and protected-branch check, see `${CLAUDE_SKILL_DIR}/references/conventions.md`.
- For GitHub pre-flight, templates, managed section, write, and verify, see `${CLAUDE_SKILL_DIR}/references/github.md`.
- For the same on GitLab, see `${CLAUDE_SKILL_DIR}/references/gitlab.md`.
- For the bundled PR and MR body templates (Default, Bugfix, Hotfix, Release, Documentation), see `${CLAUDE_SKILL_DIR}/assets/templates/`.

## Output

```text
CR: PR #<n> <url> | MR !<iid> <url> (created | updated) | none (dry-run, would create) | PR #<n> <url> | MR !<iid> <url> (dry-run, would update)
Title: <title>
Branches: <head> → <target>
Template: <name> (<explicit | repository | bundled>)
Assignee: @<self>
Reviewers: @<u1>, @<u2> | none
Draft: yes | no
Delete source branch: yes | no | chosen at review
Squash: yes | no | chosen at review | yes (enforced) | no (enforced)
Reviews:
- <role>: <status> — <n critical>, <n high>, <n medium>, <n low>
Checks:
- `<command>` → exit <n>
Commitlint: pass | skipped (not installed) | fail (<error line>) | n/a
Dropped findings: <n> (<reasons>) | none
Excluded: uncommitted changes | none
Gate: passed | stopped | reported (<n> gating findings, --gate report)
Findings file: <scratch>/findings.md (head <sha>) | none
Release: ok (<level> → <version>) | skipped (<reason>) | fixed (<codes>) | failed (<codes>)
Open: <item: impact; recommended fix; who acts, …> | none
Next: /cdk:address-change-request-review when reviews arrive | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
