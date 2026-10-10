---
name: prepare-merge-request
description: Create or update a GitLab merge request for a chosen source and target branch, fill the best-fit MR template (repository first, bundled Default/Release/Bugfix/Hotfix/Documentation fallback), set assignee, reviewers, delete-source-branch and squash options. Use only when the user explicitly asks to open, create, submit, or update a GitLab merge request, e.g. "open an MR", "create a merge request", "submit MR to main", "update my merge request". Do not use on your own after finishing a task.
argument-hint: '[optional target branch or template] [source=<branch> target=<branch>] [squash=<yes|no>] [delete-source=<yes|no>] [auto]'
allowed-tools: Bash(git status *) Bash(git rev-parse *) Bash(git remote get-url *) Bash(git fetch --prune origin) Bash(git for-each-ref *) Bash(git symbolic-ref *) Bash(git log *) Bash(git rev-list *) Bash(mktemp *) Bash(glab auth status) Bash(glab api user) Bash(glab api projects/:id) Bash(glab api --paginate projects/:id/members/all) Bash(glab api --paginate projects/:id/protected_branches) Bash(glab api projects/:id/templates/merge_requests) Bash(glab mr list *) Bash(node *release-check.mjs *)
---

# Prepare Merge Request

Input: $ARGUMENTS

## Rules

- Title follows `${CLAUDE_SKILL_DIR}/../commit-changes/conventions.md` `## Commit subject`. Repo commitlint config (`commitlint.config.*`, `.commitlintrc*`, or `commitlint` in `package.json`) → source of truth; write title to `<scratch>/title`, check `npx --no-install commitlint --edit <scratch>/title` (permission-prompted: it runs repo config). Not installed (npx error, not a lint error) → skip check, `Commitlint: skipped (not installed)`; no config → `n/a`.
- Never pass `--remove-source-branch` or `--squash-before-merge` to `glab mr create` or `glab mr update` (toggles on update). Set both only via step 13 `glab api projects/:id/merge_requests/<iid> -X PUT -F remove_source_branch=<bool> [-F squash=<bool>]`, on create and update alike.
- GitLab API reads and writes per `${CLAUDE_SKILL_DIR}/gitlab.md` `## API reads and writes`.
- Analysis in subagent: step 9 spawns `cdk:change-analyzer` (`mode=mr-summary`) to read the diff and draft the title and filled description, so large diffs stay out of this context. It cannot ask; relay its `Questions` with AskUserQuestion. Pass only root, `mode`, source, target, the chosen template body, input hints, answers to earlier `Questions`, commitlint error lines, and the conventions path.
- Description always via `--description-file -` + quoted heredoc (`<<'EOF'`); backticks and `$` stay literal.
- Never `--force`, `--no-verify`, stash, or reset. Never commit directly; the only commits come from `cdk:commit-changes` chained by the release gate (`${CLAUDE_SKILL_DIR}/../prepare-pull-request/release-gate.md`). Never clear existing reviewers or assignees silently.
- Switch only after the step 3 choice that names it; push, create, and update only after the step 13 confirmation that names them, or with the `auto` token (set by `cdk:ship-changes`, whose one settings ask is the consent). They stay out of `allowed-tools`, so the permission prompt is a second guard.
- Input tokens `squash=<yes|no>` and `delete-source=<yes|no>` preset the step 12 merge options (an enforced squash still wins; note it). `auto` skips the step 13 ask and, when step 3 would ask, takes source = current and target = default (the `source=`/`target=` presets still win): Push + `<Act>`, or `<Act>` when no push is needed. No Revise or Cancel then; a failure stops with its exact error.
- Caps: invalid Other re-asks (step 3) and invalid user titles (step 13 Revise) 3 rounds each; step 13 Revise 5 rounds; failed create/update retried once; analyzer respawn after `Questions` 1; title redrafts after a commitlint failure 3. A cap hit after step 3 (the step 3 invalid-Other cap prints `not run (stopped)`), or a failure after the step 13 retry → step 15 once on what is left, without re-entering the loop, then print the Output with `Result: stopped` and `Stopped: <step>: <reason>`. Step 1 and 7 exits, step 2 and 4 failures, and Cancel print `Resolution: not run (stopped | nothing-to-do | cancelled)`.
- Release gate: step 7 runs `${CLAUDE_SKILL_DIR}/../prepare-pull-request/release-gate.md` on every create or update (`auto` = unattended); it blocks the MR until `CHANGELOG.md` and the plugin version satisfy `.claude/release-policy.json` (repos without a policy are skipped). It never skips or overrides; a gate stop prints `Release: failed`, `Resolution: not run (stopped)`.
- Chained by other skills via the Skill tool; never set `disable-model-invocation: true` (it blocks that invocation).
- AskUserQuestion unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/fallbacks.md`.
- Final step: follow `${CLAUDE_SKILL_DIR}/../build-skill/resolve-findings.md` (scope: ask-only; sources: `Template: bundled`, `Template` fallbacks, `Commitlint:` skipped or `fail (<error line>)`, a step 14 verify mismatch).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `prepare-merge-request`.

## Workflow

1. **Pre-flight.** Per `${CLAUDE_SKILL_DIR}/gitlab.md` `## Pre-flight` (keep project response for step 12, Self, Scratch). Current = `git rev-parse --abbrev-ref HEAD`; `HEAD` (detached) → stop.
2. **Remote branches.** `git fetch --prune origin`; fail → report exact error line, stop. List `git for-each-ref --sort=-committerdate --format='%(refname:short)' refs/remotes/origin`; drop `origin/HEAD`, `origin`. Default = `git symbolic-ref --short refs/remotes/origin/HEAD` (unset → `origin/main` if listed).
3. **Branches.** Input has `source=<b>` and `target=<b>` (set by `cdk:ship-changes`), source = current, target valid per the Other rule below and ≠ source → use them, skip the ask. Else current is neither default nor protected (per `${CLAUDE_SKILL_DIR}/../commit-changes/conventions.md` `## Protected branch`) → source = current, target = input branch if valid, else default; no ask. Else (genuinely ambiguous) one AskUserQuestion, two questions, 2–4 options each, most recent first:
   - Source: current first "(Recommended)", even if never pushed; then remote branches, each description "switches to this branch".
   - Target: input branch if listed, else default first "(Recommended)"; never = source.
   - Other → validate `git rev-parse --verify --quiet origin/<name>`; invalid or source = target → re-ask.
4. **Switch.** Source ≠ current: `git status --porcelain=v1 --untracked-files=no` non-empty → stop, suggest `/cdk:commit-changes`. Else `git switch <source>` (auto-tracks `origin/<source>`). Fail → report exact error line, stop.
5. **Push need.** Decide only; step 13 confirms and pushes. Upstream missing or ≠ `origin/<source>` (`git rev-parse --abbrev-ref @{u}`) → push required (`git push -u origin HEAD:<source>`; MR needs the branch on the remote). Else `git rev-list --count @{u}..HEAD` > 0 → push recommended (`git push origin HEAD:<source>`; MR shows only pushed commits). Else no push.
6. **Existing MR.** `glab mr list --source-branch <source> -F json` (open MRs). Match → update path (keep `iid`, `title`, `description`, `assignees`, `reviewers`, `target_branch`, `force_remove_source_branch`, `squash`). None → create path.
7. **Collect.** After the step 2 fetch: `git rev-list --count origin/<target>..HEAD` = 0 → report "no changes vs <target>", `Result: nothing-to-do`, stop. Then the release gate (`../prepare-pull-request/release-gate.md`, `auto` as unattended); when it added commits, recompute the step 5 push need.
8. **Template.**
   - Sources in order: repo `.gitlab/merge_request_templates/*.md`; else `glab api projects/:id/templates/merge_requests` (`[{key,name}]`, includes group/instance), content via `glab api projects/:id/templates/merge_requests/<key>` (`.content`; URL-encode key, space → `%20`); else bundled `${CLAUDE_SKILL_DIR}/templates/*.md`.
   - Infer kind: input names template → use it. Else branch prefix, then dominant subject type from `git log --format='%s' origin/<target>..HEAD`: `fix/`→Bugfix, `hotfix/`→Hotfix, `release/`→Release, `docs/`→Documentation, other→Default. Map to closest available name (case-insensitive).
   - Use the inferred template, no ask; step 13 Revise changes it. Keep its body for step 9.
   - Update path → keep existing description (preserves manual edits), no ask; refill from template only if input asks.
9. **Draft.** Create path, or update path with a refill request or a title that fails the title rules → spawn `cdk:change-analyzer` with root, `mode=mr-summary`, source, target, the template body, input hints, and `${CLAUDE_SKILL_DIR}/../commit-changes/conventions.md`. Take `Title`, and `Description` only on the create path or a refill request (the body filled from the commits and diff; linked issues from commit subjects; quick actions stripped, since later steps set those explicitly); `Empty: yes` → as step 7; `Questions` non-empty → AskUserQuestion, then respawn once with the answers. Update path: Revise back to step 8 (new template) counts as a refill request and respawns here. Update path without a spawn → keep the existing title (it passes the rules) and description. Run the Rules title check on `Title`; fail → respawn with the error lines (cap in Rules). No ask; step 13 shows them.
10. **Assignee.** create → self. Update → `assignees` empty → self; else unchanged.
11. **Reviewers.** Create → none. Update → keep current reviewers. No ask; step 13 shows them and Revise can change them (typed usernames must be project members: `glab api --paginate projects/:id/members/all`, `state=active`, else re-ask).
12. **Merge options.** No ask; step 13 shows them. Input presets win (squash enforced → enforced value). Else update path → keep the MR's current `force_remove_source_branch` and `squash` (squash enforced → enforced value). Create path → step 1 project defaults: delete source branch = `remove_source_branch_after_merge`; squash by `squash_option`: `always`/`never` → enforced, `default_on` → yes, `default_off` → no.
13. **Submit.** `auto` → show the same summary, take the recommended option, skip the question. Else show title, branches, template, assignee, reviewers, merge options, push need (step 5), and the first lines of the description. AskUserQuestion, `<Act>` = Create MR or Update MR: push required → Push + `<Act>` (Recommended) | Revise | Cancel; push recommended → Push + `<Act>` (Recommended) | `<Act>`, no push | Revise | Cancel; no push → `<Act>` (Recommended) | Revise | Cancel. Revise → back to the step the user names (max 5); user-given title fails rules → say why, re-ask. Cancel → stop, nothing pushed or created, `Result: cancelled`. Push option → step 5 push command first; fail → report exact error line, retry once, then step 15 and `Stopped:` (cap in Rules). Title with `'` → escape as `'\''` inside single quotes. Create: `glab mr create -s <source> -b <target> -t '<title>' -a <self> [--reviewer <u1,u2>] -y --description-file - <<'EOF'` … `EOF`; keep the new `iid`. Update: `glab mr update <iid> -t '<title>' [-a <self>] [--reviewer <u1,u2>] [--target-branch <target>] -y [--description-file - <<'EOF'` … `EOF]`; `--reviewer` without prefix replaces list, so pass full selection; `--target-branch` only if changed; description only if refilled. Then, create and update alike: `glab api projects/:id/merge_requests/<iid> -X PUT -F remove_source_branch=<bool> [-F squash=<bool>]`; squash enforced → omit `-F squash`. Fail → report exact error line, diagnose, fix, retry once; still failing → step 15, then `Stopped:`.
14. **Verify.** `glab api -X GET projects/:id/merge_requests/<iid>`. Check `title` passes rules; `source_branch`, `target_branch`, `assignees`, `reviewers` match; `force_remove_source_branch`, `squash` match chosen values (enforced squash → skip). Mismatch → report field, go to step 15, then `Stopped:`.
15. **Resolve findings.** Per resolve-findings.md. Edit nothing; report each item with its recommended fix and who acts.

## Output

```text
MR: !<iid> <web_url> (created | updated)
Title: <title>
Branches: <source> → <target>
Template: <name> (<repo | group/instance | bundled>)
Assignee: @<username>
Reviewers: @<u1>, @<u2> | none
Delete source branch: yes | no
Squash: yes | no [enforced]
Commitlint: pass | skipped (not installed) | fail (<error line>) | n/a
Release: ok (<level> → <version>) | skipped (<reason>) | fixed (<codes>) | failed (<codes>)
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
