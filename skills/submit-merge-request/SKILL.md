---
name: submit-merge-request
description: Create or update a GitLab merge request for a chosen source and target branch, fill the best-fit MR template (repository first, bundled Default/Release/Bugfix/Hotfix/Documentation fallback), set assignee, reviewers, delete-source-branch and squash options. Use only when the user explicitly asks to open, create, submit, or update a GitLab merge request, e.g. "open an MR", "create a merge request", "submit MR to main", "update my merge request". Do not use on your own after finishing a task.
argument-hint: '[optional target branch or template] [source=<branch> target=<branch>]'
allowed-tools: Bash(git status *) Bash(git rev-parse *) Bash(git remote get-url *) Bash(git fetch --prune origin) Bash(git for-each-ref *) Bash(git symbolic-ref *) Bash(git log *) Bash(git diff *) Bash(git rev-list *) Bash(mktemp *) Bash(glab auth status) Bash(glab api user) Bash(glab api projects/:id) Bash(glab api --paginate projects/:id/members/all) Bash(glab api projects/:id/templates/merge_requests*) Bash(glab api -X GET projects/:id/merge_requests/*) Bash(glab mr list *)
---

# Submit Merge Request

Input: $ARGUMENTS

## Rules

- Title follows `${CLAUDE_SKILL_DIR}/../commit-changes/conventions.md` `## Commit subject`. Repo commitlint config (`commitlint.config.*`, `.commitlintrc*`, or `commitlint` in `package.json`) → source of truth; write title to `<scratch>/title`, check `npx --no-install commitlint --edit <scratch>/title` (permission-prompted: it runs repo config). Not installed (npx error, not a lint error) → skip check, note it.
- Never pass `--remove-source-branch` or `--squash-before-merge` to `glab mr create` or `glab mr update` (toggles on update). Set both only via step 14 `glab api projects/:id/merge_requests/<iid> -X PUT -F remove_source_branch=<bool> [-F squash=<bool>]`, on create and update alike.
- GitLab API reads and writes per `${CLAUDE_SKILL_DIR}/gitlab.md` `## API reads and writes`.
- Description always via `--description-file -` + quoted heredoc (`<<'EOF'`); backticks and `$` stay literal.
- Never `--force`, `--no-verify`, commit, stash, or reset. Never clear existing reviewers or assignees silently.
- Push, switch, create, and update only after the confirmation that names them (steps 4, 6, and 14). They stay out of `allowed-tools`, so the permission prompt is a second guard.
- Caps: invalid Other re-asks (steps 4, 12) and title Revise (step 10) 3 rounds each; step 14 Revise 5 rounds; failed create/update retried once. Cap hit → stop, report.
- Chained by other skills via the Skill tool; never set `disable-model-invocation: true` (it blocks that invocation).
- AskUserQuestion unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/fallbacks.md`.
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `submit-merge-request`.

## Workflow

1. **Pre-flight.** Per `${CLAUDE_SKILL_DIR}/gitlab.md` `## Pre-flight` (keep project response for step 13, Self, Scratch). Current = `git rev-parse --abbrev-ref HEAD`; `HEAD` (detached) → stop.
2. **Remote branches.** `git fetch --prune origin`; fail → report exact error line, stop. List `git for-each-ref --sort=-committerdate --format='%(refname:short)' refs/remotes/origin`; drop `origin/HEAD`, `origin`. Default = `git symbolic-ref --short refs/remotes/origin/HEAD` (unset → `origin/main` if listed).
3. **Reviewer pool.** `glab api --paginate projects/:id/members/all`; keep `state=active`, `access_level ≥ 30` (Developer+); dedupe by `id`; drop Self from pool.
4. **Branches.** Input has `source=<b>` and `target=<b>` (set by `cdk:ship-merge-request`), source = current, target valid per the Other rule below and ≠ source → use them, skip the ask. Else one AskUserQuestion, two questions, 2–4 options each, most recent first:
   - Source: current first "(Recommended)", even if never pushed; then remote branches, each description "switches to this branch".
   - Target: input branch if listed, else default first "(Recommended)"; never = source.
   - Other → validate `git rev-parse --verify --quiet origin/<name>`; invalid or source = target → re-ask.
5. **Switch.** Source ≠ current: `git status --porcelain=v1 --untracked-files=no` non-empty → stop, suggest `/cdk:commit-changes`. Else `git switch <source>` (auto-tracks `origin/<source>`). Fail → report exact error line, stop.
6. **Push.** Upstream missing or ≠ `origin/<source>` (`git rev-parse --abbrev-ref @{u}`) → AskUserQuestion: Push -u (Recommended, MR needs the branch on the remote) | Cancel; yes → `git push -u origin HEAD:<source>`. Else `git rev-list --count @{u}..HEAD` > 0 → AskUserQuestion: Push (Recommended, MR shows only pushed commits) | Skip; yes → `git push origin HEAD:<source>`. Fail → report exact error line, stop.
7. **Existing MR.** `glab mr list --source-branch <source> -F json` (open MRs). Match → update path (keep `iid`, `title`, `description`, `assignees`, `reviewers`, `target_branch`). None → create path.
8. **Collect.** Pushed state: `git log --format='%h %s' origin/<target>..origin/<source>`, `git diff --stat origin/<target>...origin/<source>`. Empty → report "no changes vs <target>", `Result: nothing-to-do`, stop.
9. **Template.**
   - Sources in order: repo `.gitlab/merge_request_templates/*.md`; else `glab api projects/:id/templates/merge_requests` (`[{key,name}]`, includes group/instance), content via `glab api projects/:id/templates/merge_requests/<key>` (`.content`; URL-encode key, space → `%20`); else bundled `${CLAUDE_SKILL_DIR}/templates/*.md`.
   - Infer kind: input names template → use it. Else branch prefix/dominant commit type: `fix/`→Bugfix, `hotfix/`→Hotfix, `release/`→Release, `docs/`→Documentation, other→Default. Map to closest available name (case-insensitive).
   - One template available → use it, no ask. Else AskUserQuestion: inferred "(Recommended)" + up to 3 others.
   - Fill sections from step 8 commits/diff and linked issues in commit subjects. Keep headings and checklists; replace comments with content; drop comments you cannot fill. Strip quick actions (`/assign`, `/label`, …); later steps set those explicitly.
   - Update path → AskUserQuestion: Keep existing description (Recommended, preserves manual edits) | Refill from template. Show first lines of both.
10. **Title.** Draft from step 8: one commit → its subject; many → dominant type + imperative summary. Update path: keep existing title only if it passes all title rules. Show title → AskUserQuestion: Use (Recommended) | Revise. Revised → re-check, re-ask until valid (max 3).
11. **Assignee.** create → self. Update → `assignees` empty → self; else unchanged.
12. **Reviewers.** Order pool: current reviewers first, then `access_level` desc, then `username`. Take first 16. Split into up to 4 `multiSelect: true` questions of 2–4 users each, balanced (5 → 3+2; never 1). Pool of 1 → one question: `@username` | No reviewer. Label `@username`, description `name — <role>`; mark current "(current)". Other → typed usernames, each must be in pool, else re-ask. Pool empty → skip, report. Update path + nothing selected → keep current reviewers.
13. **Merge options.** From step 1 project response. Delete source branch: AskUserQuestion Yes | No; `remove_source_branch_after_merge` true → Yes "(Recommended, project default)", else No "(Recommended, project default)". Squash by `squash_option`: `always`/`never` → enforced, skip ask, report value; `default_on` → Yes "(Recommended, project default)" | No; `default_off` → No "(Recommended, project default)" | Yes. Ask both in one AskUserQuestion when both needed.
14. **Submit.** Show title, branches, template, assignee, reviewers, merge options, and the first lines of the description. AskUserQuestion: Create MR / Update MR (Recommended) | Revise | Cancel. Revise → back to the step the user names (max 5). Cancel → stop, nothing created, `Result: cancelled`. Title with `'` → escape as `'\''` inside single quotes. Create: `glab mr create -s <source> -b <target> -t '<title>' -a <self> [--reviewer <u1,u2>] -y --description-file - <<'EOF'` … `EOF`; keep the new `iid`. Update: `glab mr update <iid> -t '<title>' [-a <self>] [--reviewer <u1,u2>] [--target-branch <target>] -y [--description-file - <<'EOF'` … `EOF]`; `--reviewer` without prefix replaces list, so pass full selection; `--target-branch` only if changed; description only if Refill. Then, create and update alike: `glab api projects/:id/merge_requests/<iid> -X PUT -F remove_source_branch=<bool> [-F squash=<bool>]`; squash enforced → omit `-F squash`. Fail → report exact error line, diagnose, fix, retry once; still failing → stop.
15. **Verify.** `glab api -X GET projects/:id/merge_requests/<iid>`. Check `title` passes rules; `source_branch`, `target_branch`, `assignees`, `reviewers` match; `force_remove_source_branch`, `squash` match chosen values (enforced squash → skip). Mismatch → report field, stop.

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
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
