---
name: prepare-pull-request
description: Review a branch with five parallel read-only reviewers, then create or update a GitHub pull request for a target branch you select, with a filled template, the current gh user as assignee, and only a managed section of the body updated. Use only when the user explicitly asks to prepare, open, create, submit, or update a GitHub pull request, e.g. "prepare a PR", "open a pull request", "create a PR to main", "update my pull request". Do not use on your own after finishing a task.
argument-hint: '[--target <branch>] [--template <name|path>] [--draft] [--dry-run] [--yes]'
allowed-tools: Bash(git rev-parse *) Bash(git status *) Bash(git remote) Bash(git remote get-url *) Bash(git fetch --all --prune) Bash(git for-each-ref *) Bash(git merge-base *) Bash(git rev-list *) Bash(git log *) Bash(git diff *) Bash(git show *) Bash(git ls-files *) Bash(node *release-check.mjs *) Bash(mktemp *) Bash(gh auth status) Bash(gh repo view *) Bash(gh api user --jq .login) Bash(gh pr list *) Bash(gh pr view *)
---

# Prepare Pull Request

Input: $ARGUMENTS

## Rules

- User interaction (AskUserQuestion) only here; subagents cannot ask. Missing or ambiguous repository state, target, template, check result, or PR identity → stop with the reason; never guess.
- Always ask for the target branch from the fetched remote branches, even when a default branch is detectable; never preselect or mark an option recommended for it. Only `--target <branch>` (set by `cdk:ship-changes`, which asks once) skips the ask; it must be a branch in the filtered list, else stop.
- Review only the committed range `merge-base..HEAD`; uncommitted changes are out of scope, so reviewers and the PR never describe them.
- Only this skill writes: `git push`, `gh pr create`, `gh pr edit`, `gh pr ready`, and only in step 13 after the step 12 confirmation, or with `--yes` (set by `cdk:ship-changes`, whose one settings ask is the consent; `--yes` never skips a stop or the step 8 gate). They stay out of `allowed-tools`, so the permission prompt is a second guard.
- Reviewers: a small, low-risk change per `${CLAUDE_SKILL_DIR}/findings.md` `## Direct review` is reviewed in this context with no subagents; otherwise the five reviewers (`cdk:pr-correctness-reviewer`, `cdk:pr-test-reviewer`, `cdk:pr-security-reviewer`, `cdk:pr-maintainability-reviewer`, `cdk:pr-docs-reviewer`) have no write tools and a read-only command allowlist.
- Reviewers return the block in `${CLAUDE_SKILL_DIR}/findings.md`; parse, validate, deduplicate, and gate per its `## Parent validation`. Pass each reviewer only root, base ref, merge-base, HEAD SHA, scratch file paths, and that path.
- GitHub reads, branch listing, PR identity, templates, managed section, and command rules: `${CLAUDE_SKILL_DIR}/github.md`.
- PR title: Conventional Commits `<type>(<optional scope>): <subject>`, max 72 chars, imperative, no attribution; the body carries no attribution either. Rules per `${CLAUDE_SKILL_DIR}/../commit-changes/conventions.md` `## Commit subject`; a repo commitlint config (`commitlint.config.*`, `.commitlintrc*`, or `commitlint` in `package.json`) wins and is checked with `npx --no-install commitlint --edit <scratch>/title` (permission-prompted; not installed → skip, note it).
- Body claims come only from commits, the diff, and reviewer evidence; unknown → leave the template placeholder. Never invent tests, issues, or results.
- Existing PR: change only the managed section and, when chosen, the title; keep every other byte of the body, assignees, and reviewers.
- Body goes through `<scratch>/body.md` and `-F`; never inline text in shell args.
- Caps: invalid Other target 3 re-asks; reviewer respawn on a malformed return 1; title redrafts after a lint failure 3; step 12 Revise 3 rounds; failed create or update retried once. Cap hit (including the title lint cap) → step 15 once on what is left, without re-entering the loop, then print the Output with `Result: stopped` and `Stopped: <step>: <reason>`. Pre-step stops (steps 1–5) print `Resolution: not run (stopped)`, except the step 5 nothing-to-do exit, which prints `not run (nothing-to-do)`; a stop at step 9 or 10 follows the review, so it runs step 15 first; Cancel prints `not run (cancelled)`.
- `--yes` skips only the step 12 question. `--dry-run` runs steps 1–12, prints the result, and writes nothing (no push, no PR).
- Never `--force`, `--no-verify`, stash, or reset. Never commit directly; the only commits come from `cdk:commit-changes` chained by the release gate (`${CLAUDE_SKILL_DIR}/release-gate.md`).
- Release gate: step 5 runs `${CLAUDE_SKILL_DIR}/release-gate.md` on every create or update; it blocks the PR until `CHANGELOG.md` and the plugin version satisfy `.claude/release-policy.json` (repos without a policy are skipped). It never skips or overrides; a gate stop prints `Release: failed`, `Resolution: not run (stopped)`.
- Chained by other skills via the Skill tool; never set `disable-model-invocation: true`.
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/fallbacks.md`.
- Final step: follow `${CLAUDE_SKILL_DIR}/../build-skill/resolve-findings.md` (scope: ask-only; sources: medium and low findings in the managed section, `Dropped findings`, `Excluded:`, reviewers with `Status: incomplete`, failed or skipped checks).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `prepare-pull-request`; it covers reviewer `Known issue:` lines.

## Workflow

1. **Args.** Parse `$ARGUMENTS`: `--target <value>`, `--template <value>`, `--draft`, `--dry-run`, `--yes`. Unknown flag or `--target` or `--template` without a value → stop.
2. **Pre-flight.** Per `${CLAUDE_SKILL_DIR}/github.md` `## Pre-flight`; keep Repo, Root, Branch, Self, Scratch.
3. **Remote branches.** Per `github.md` `## Remote branches`; keep the filtered list.
4. **Target.** `--target <b>` → the list must hold exactly one ref whose branch part is `<b>` (several remotes → stop, name them); none → stop; skip the ask. Else print the whole list. AskUserQuestion with the four most recent branches plus Other (typed value must be in the list, else re-ask within the cap); none marked recommended. Selected ref's remote must match Repo (`github.md`). Target = its branch part.
5. **Range.** `mb = git merge-base <target ref> HEAD`; none → stop. `git rev-list --count <mb>..HEAD` = 0 → report "no commits vs <target>", `Result: nothing-to-do`. Then the release gate (`release-gate.md`, with `--yes` as unattended); when it added commits, recompute `mb` and the range. With the Write tool (scratch path only; Bash redirects would not match `allowed-tools`) save the output of `git diff <mb>..HEAD`, `git diff --name-status <mb>..HEAD`, and `git log --format='%h %s' <mb>..HEAD` to `<scratch>/diff.patch`, `name-status.txt`, `log.txt`. Push need: no upstream, upstream not on the target's remote, or `git rev-list --count @{u}..HEAD` > 0 → push required (`git push -u <remote> HEAD:<branch>`), else none.
6. **Review.** Direct-review criteria met → review per `findings.md` `## Direct review`, mark the reviewers `direct`, go to step 7. Else one message, five parallel Agent calls: `cdk:pr-correctness-reviewer`, `cdk:pr-test-reviewer`, `cdk:pr-security-reviewer`, `cdk:pr-maintainability-reviewer`, `cdk:pr-docs-reviewer`, each with root, `<target ref>`, `<mb>`, HEAD SHA, the three scratch paths, and `${CLAUDE_SKILL_DIR}/findings.md`.
7. **Aggregate.** Per `findings.md` `## Parent validation`: parse, respawn once on a malformed block, drop invalid findings (keep their list), deduplicate. Print findings sorted by severity with roles, evidence, and recommendations.
8. **Gate.** Any gating finding or failed or incomplete required check per `findings.md` → print them, `Result: stopped`, `Stopped: 8: <reason>`, then step 15 (Resolve findings, no edits) before ending. Applies to `--dry-run` too.
9. **Existing PR.** Per `github.md` `## Pull request identity`: 0 → create, 1 → update (keep its number, title, body, assignees, draft flag), more → stop.
10. **Template.** Per `github.md` `## Templates`; keep its text and source (`explicit`, `repository`, `fallback`). `--template` unresolved → stop.
11. **Draft.** Title per Rules, from the commit subjects; write to `<scratch>/title` and lint it (cap in Rules). Create path body: fill the template, then append the managed block. Update path body: replace only the managed block (append when absent), per `github.md` `## Managed section`. The block holds a summary drawn from each reviewer `Summary`, per-role status and counts, commands with exit codes, medium and low findings, and limitations, including any reviewer with `Status: incomplete`. Existing title failing the title rules → note it. Write `<scratch>/body.md`.
12. **Confirm.** Show title, base ← head, template and source, assignee Self, draft, push need, and the body. `--dry-run` → print this as the result, `Result: done`, then step 15 and end. `--yes` → take the recommended effect without asking (`Push + Create PR`, `Create PR`, or `Update PR`, `Update PR + title` only when the existing title fails the title rules, else `Update PR`, prefixed `Push +` when needed). Else one AskUserQuestion, options naming each effect: push required → `Push + Create PR` | Revise | Cancel; push none → `Create PR`; update path → `Update PR` (keep title, recommended unless the title fails the rules) | `Update PR + title`, each prefixed `Push +` when a push is needed. Every variant also offers Revise and Cancel. Revise → back to the step the user names (cap in Rules). Cancel → `Result: cancelled`, nothing written.
13. **Write.** Only the confirmed effects, in order: `git push -u <remote> HEAD:<branch>` (`<remote>` = the target ref's remote); create `gh pr create -B <target> -H <branch> -t '<title>' -F <scratch>/body.md -a @me [-d]`; update `gh pr edit <n> -F <scratch>/body.md --add-assignee @me [-t '<title>']`, and with `--draft` on a ready PR `gh pr ready <n> --undo`. Failure → report the exact error line, retry once, then step 15 and `Stopped: 13: <reason>`.
14. **Verify.** `<n>` = existing number, or parsed from the URL `gh pr create` prints. `gh pr view <n> --json number,url,title,baseRefName,headRefName,isDraft,assignees,body`: base and head match, Self among assignees, draft flag as requested, both markers present once, and on update the text outside the markers equals the pre-write body. Mismatch → report the field, then step 15 and `Stopped: 14: <field mismatch>`.
15. **Resolve findings.** Per resolve-findings.md. Edit and post nothing; report each item with its recommended fix and who acts. A gating finding in step 8 ends the run through this step with `Result: stopped`, so its items still get impact and a recommended fix.

## Output

```text
PR: #<n> <url> (created | updated) | none (dry-run, would create) | #<n> <url> (dry-run, would update)
Title: <title>
Branches: <head> → <target>
Template: <name> (<explicit | repository | fallback>)
Assignee: @<self>
Draft: yes | no
Reviewers:
- <role>: <status> — <n critical>, <n high>, <n medium>, <n low>
Checks:
- `<command>` → exit <n>
Dropped findings: <n> (<reasons>) | none
Excluded: uncommitted changes | none
Release: ok (<level> → <version>) | skipped (<reason>) | fixed (<codes>) | failed (<codes>)
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
