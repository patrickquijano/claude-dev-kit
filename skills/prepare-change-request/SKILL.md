---
name: prepare-change-request
description: Review a branch with five parallel read-only reviewers (or directly for a small change), then create or update a GitHub pull request or GitLab merge request for a target branch, with a filled template, yourself as assignee, and only a managed section of the body updated. The host comes from the origin remote. Use only when the user explicitly asks to prepare, open, create, submit, or update a pull request or merge request, e.g. "prepare a PR", "open an MR", "create a pull request to main", "update my merge request". Do not use on your own after finishing a task.
argument-hint: '[--target <branch>] [--template <name|path>] [--draft] [--dry-run] [--yes] [--squash <yes|no>] [--delete-branch <yes|no>]'
allowed-tools: Bash(git rev-parse *) Bash(git status *) Bash(git remote) Bash(git remote get-url *) Bash(git fetch --all --prune) Bash(git fetch --prune origin) Bash(git for-each-ref *) Bash(git symbolic-ref *) Bash(git merge-base *) Bash(git rev-list *) Bash(git log *) Bash(git diff *) Bash(git show *) Bash(git ls-files *) Bash(node *release-check.mjs *) Bash(mktemp *) Bash(gh auth status) Bash(gh repo view *) Bash(gh api user --jq .login) Bash(gh pr list *) Bash(gh pr view *) Bash(glab auth status) Bash(glab api user) Bash(glab api projects/:id) Bash(glab api --paginate projects/:id/members/all) Bash(glab api projects/:id/templates/merge_requests) Bash(glab mr list *)
---

# Prepare Change Request

Input: $ARGUMENTS

A change request (CR) is a GitHub pull request or a GitLab merge request.

## Rules

- User interaction (AskUserQuestion) only here; subagents cannot ask. Missing or ambiguous repository state, target, template, check result, or CR identity → stop with the reason; never guess.
- Host from `git remote get-url origin`: `github.com` → GitHub (`gh`, `${CLAUDE_SKILL_DIR}/github.md`); any other host → GitLab (`glab`, `${CLAUDE_SKILL_DIR}/gitlab.md`). One workflow; each step names the host-file section it uses.
- Review only the committed range `merge-base..HEAD`; uncommitted changes are out of scope, so reviewers and the CR never describe them.
- Target: `--target <branch>` (set by `cdk:ship-release` and `cdk:scan-vulnerabilities`), else the host's default branch when step 4 finds one; ask only when none is found. The step 13 confirmation shows the branches and Revise can change them.
- Only this skill writes: `git push`, CR create and update, the draft flag, and (GitLab) the merge options, and only in step 14 after the step 13 confirmation, or with `--yes`; the release gate's chained `cdk:commit-changes` also pushes, under the gate's own consent. They stay out of `allowed-tools`, so the permission prompt is a second guard.
- `--yes` (set by `cdk:ship-release` and `cdk:scan-vulnerabilities`, whose invocation is the consent) skips only the consent asks: the step 13 question and the release gate's ask. It never skips a stop, the step 8 gate, or the release gate itself. `--dry-run` runs steps 1–13, prints the result, and writes nothing (no push, no CR).
- Reviewers: a small, low-risk change per `${CLAUDE_SKILL_DIR}/findings.md` `## Direct review` is reviewed in this context with no subagents; otherwise the five reviewers (`cdk:cr-correctness-reviewer`, `cdk:cr-test-reviewer`, `cdk:cr-security-reviewer`, `cdk:cr-maintainability-reviewer`, `cdk:cr-docs-reviewer`) have no write tools and a read-only command allowlist.
- Reviewers return the block in `${CLAUDE_SKILL_DIR}/findings.md`; parse, validate, deduplicate, and gate per its `## Parent validation`. Pass each reviewer only root, base ref, merge-base, HEAD SHA, scratch file paths, and that path.
- CR title: Conventional Commits `<type>(<optional scope>): <subject>`, max 72 chars, imperative, no attribution; the body carries no attribution either. Rules per `${CLAUDE_SKILL_DIR}/../commit-changes/conventions.md` `## Commit subject`; a repo commitlint config (`commitlint.config.*`, `.commitlintrc*`, or `commitlint` in `package.json`) wins and is checked with `npx --no-install commitlint --edit <scratch>/title` (permission-prompted; not installed → skip, note it `skipped (not installed)`; no config → `n/a`).
- Body claims come only from commits, the diff, and reviewer evidence; unknown → leave the template placeholder. Never invent tests, issues, or results.
- Existing CR: change only the managed section and, when chosen, the title; keep every other byte of the body, assignees, and reviewers.
- Body goes through `<scratch>/body.md`; never inline text in shell args (host file `## Write`).
- Assignee = Self; reviewers: none on create, kept on update, changed only by a Revise.
- Merge options: `--squash <yes|no>` and `--delete-branch <yes|no>` preset them. GitLab sets them through the API on create and update; GitHub carries them to `cdk:review-change-request` (its merge applies them).
- Caps: invalid Other target 3 re-asks; invalid reviewer username 3 re-asks; reviewer respawn on a malformed return 1; analyzer respawn after `Questions` 1; title redrafts after a lint failure 3; step 13 Revise 5 rounds; failed push, create, or update retried once; release gate remediation 2 rounds. Cap hit (including the title lint cap) → step 16 once on what is left, without re-entering the loop, then print the Output with `Result: stopped` and `Stopped: <step>: <reason>`. Pre-step stops (steps 1–5, except a release gate stop, which runs step 16) print `Resolution: not run (stopped)`, except the step 5 nothing-to-do exit, which prints `not run (nothing-to-do)`; a stop at step 9 or 10 follows the review, so it runs step 16 first; Cancel prints `not run (cancelled)`.
- Never `--force`, `--no-verify`, stash, or reset. Never commit directly; the only commits come from `cdk:commit-changes` chained by the release gate (`${CLAUDE_SKILL_DIR}/release-gate.md`). Never clear existing reviewers or assignees silently.
- Release gate: step 5 runs `${CLAUDE_SKILL_DIR}/release-gate.md` (target, `--yes` as unattended, `--dry-run` as dry-run, step 5) on every create or update; it blocks the CR until `CHANGELOG.md` and the plugin version satisfy `.claude/release-policy.json` (repos without a policy are skipped). It never skips or overrides; a gate stop ends the run through step 16 (Resolve findings) with `Release: failed (<codes>)`, `Result: stopped`, and `Stopped: <step>: release gate <codes>: <fix>`; a Revise back to the range or collect step never re-runs the gate; remediation is capped at 2 rounds, and its push is covered by the gate's consent (or `--yes`).
- Chained by other skills via the Skill tool; never set `disable-model-invocation: true`.
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/fallbacks.md`.
- Final step: follow `${CLAUDE_SKILL_DIR}/../build-skill/resolve-findings.md` (scope: ask-only; sources: medium and low findings in the managed section, `Dropped findings`, `Excluded:`, reviewers with `Status: incomplete`, failed or skipped checks, `Template: bundled`, `Commitlint:` skipped or `fail (<error line>)`, `Release: failed (<codes>)`, a step 15 verify mismatch).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `prepare-change-request` and store `${CLAUDE_PLUGIN_DATA}/known-issues`; it covers reviewer `Known issue:` lines.

## Workflow

1. **Args.** Parse `$ARGUMENTS`: `--target <value>`, `--template <value>`, `--draft`, `--dry-run`, `--yes`, `--squash <yes|no>`, `--delete-branch <yes|no>`. Unknown flag, a flag without its value, or a value outside `yes|no` → stop.
2. **Pre-flight.** Detect the host (Rules), then host file `## Pre-flight`; keep Repo or Project, Root, Branch, Self, Scratch. Branch is the default or a protected branch (per `${CLAUDE_SKILL_DIR}/../commit-changes/conventions.md` `## Protected branch`) → stop, suggest `/cdk:switch-branch`.
3. **Remote branches.** Host file `## Remote branches`; keep the filtered list and the default.
4. **Target.** `--target <b>` → the list must hold exactly one ref whose branch part is `<b>` (several remotes → stop, name them); none → stop. Else Target = the default, no ask. No default found → print the whole list, AskUserQuestion with the four most recent branches plus Other (typed value must be in the list, else re-ask within the cap). GitHub: the selected ref's remote must match Repo (`github.md` `## Remote branches`). Target = its branch part; the target ref is `<remote>/<branch>`.
5. **Range.** `mb = git merge-base <target ref> HEAD`; none → stop. `git rev-list --count <mb>..HEAD` = 0 → report "no commits vs <target>", `Result: nothing-to-do`. Then the release gate (`release-gate.md`; target, `--yes` as unattended, `--dry-run` as dry-run, step 5); when it added commits, recompute `mb` and the range. With the Write tool (scratch path only; Bash redirects would not match `allowed-tools`) save the output of `git diff <mb>..HEAD`, `git diff --name-status <mb>..HEAD`, and `git log --format='%h %s' <mb>..HEAD` to `<scratch>/diff.patch`, `name-status.txt`, `log.txt`. Push need: no upstream, upstream not on the target's remote, or `git rev-list --count @{u}..HEAD` > 0 → push required (host file `## Write`), else none.
6. **Review.** Direct-review criteria met → review per `findings.md` `## Direct review`, mark the reviewers `direct`, go to step 7. Else one message, five parallel Agent calls: `cdk:cr-correctness-reviewer`, `cdk:cr-test-reviewer`, `cdk:cr-security-reviewer`, `cdk:cr-maintainability-reviewer`, `cdk:cr-docs-reviewer`, each with root, `<target ref>`, `<mb>`, HEAD SHA, the three scratch paths, and `${CLAUDE_SKILL_DIR}/findings.md`.
7. **Aggregate.** Per `findings.md` `## Parent validation`: parse, respawn once on a malformed block, drop invalid findings (keep their list), deduplicate. Print findings sorted by severity with roles, evidence, and recommendations.
8. **Gate.** Any gating finding or failed or incomplete required check per `findings.md` → print them, `Result: stopped`, `Stopped: 8: <reason>`, then step 16 (Resolve findings, no edits) before ending. Applies to `--dry-run` too.
9. **Existing CR.** Host file `## Identity`: 0 → create, 1 → update, more → stop.
10. **Template.** `--template` resolves per the host file `## Templates`. Else infer the kind (no ask): branch prefix, then the dominant subject type in `<scratch>/log.txt`: `fix/` → Bugfix, `hotfix/` → Hotfix, `release/` → Release, `docs/` → Documentation, other → Default; the repository's templates come first, the bundled `templates/<Kind>.md` last. Keep its text and source (`explicit`, `repository`, `bundled`). `--template` unresolved → stop. Update path → the body is kept, so only the managed block is drafted; a Revise to another template needs no respawn then.
11. **Draft.** Create path (or an update whose title fails the title rules): spawn `cdk:change-analyzer` with root, `mode=cr-summary`, head (current branch), `<target ref>`, the template body, input hints, and `${CLAUDE_SKILL_DIR}/../commit-changes/conventions.md`. Take `Title`, and `Description` on the create path (the template filled from commits and diff; linked issues from commit subjects; quick actions stripped); `Empty: yes` → as step 5; `Questions` non-empty → AskUserQuestion, then respawn once with the answers. Run the Rules title check on `Title`; fail → respawn with the error lines (cap in Rules). Update path with a passing title → keep it, no spawn. Then the managed block: a summary drawn from each reviewer `Summary`, per-role status and counts, commands with exit codes, medium and low findings, and limitations, including any reviewer with `Status: incomplete`. Create path body: the filled template, then the block appended; update path body: only the block replaced (appended when absent), per host file `## Managed section`. Existing title failing the title rules → note it. Write `<scratch>/title` and `<scratch>/body.md`.
12. **Options.** Assignee Self. Reviewers: create → none, update → current. Merge options per the host file `## Write` (GitHub: the flags only, else `chosen at review`). No ask; step 13 shows them and Revise can change them.
13. **Confirm.** Show title, base ← head, template and source, assignee, reviewers, draft, merge options, push need, and the body. `--dry-run` → print this as the result, `Result: done`, then step 16 and end. `--yes` → take the recommended effect without asking. Else one AskUserQuestion with options naming each effect: push required → `Push + Create CR` (Recommended) | Revise | Cancel; push none → `Create CR` (Recommended) | Revise | Cancel; update path → `Update CR` (keep title, recommended unless the title fails the rules) | `Update CR + title`, each prefixed `Push +` when a push is needed, plus Revise and Cancel. Revise → back to the step the user names (cap in Rules). Cancel → `Result: cancelled`, nothing written. Name the CR `PR` or `MR` by host in the labels.
14. **Write.** Only the confirmed effects, in order, per the host file `## Write`: push, create or update, the draft flag, then (GitLab) the merge options. Failure → report the exact error line, retry once, then step 16 and `Stopped: 14: <reason>`.
15. **Verify.** Per the host file `## Verify`. Mismatch → report the field, then step 16 and `Stopped: 15: <field mismatch>`.
16. **Resolve findings.** Per resolve-findings.md. Edit and post nothing; report each item with its recommended fix and who acts. A gating finding in step 8 ends the run through this step with `Result: stopped`, so its items still get impact and a recommended fix.

## Output

```text
CR: PR #<n> <url> | MR !<iid> <url> (created | updated) | none (dry-run, would create) | #<n> <url> (dry-run, would update)
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
Release: ok (<level> → <version>) | skipped (<reason>) | fixed (<codes>) | failed (<codes>)
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
