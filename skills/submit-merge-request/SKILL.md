---
name: submit-merge-request
description: Create or update a GitLab merge request for a chosen source and target branch, fill the best-fit MR template (repository first, bundled Default/Release/Bugfix/Hotfix/Documentation fallback), set assignee, reviewers, delete-source-branch and squash options. Use only when the user explicitly asks to open, create, submit, or update a GitLab merge request, e.g. "open an MR", "create a merge request", "submit MR to main", "update my merge request". Do not use on your own after finishing a task.
argument-hint: '[optional target branch or template]'
allowed-tools: Bash(git status *) Bash(git rev-parse *) Bash(git remote get-url *) Bash(git fetch --prune origin) Bash(git for-each-ref *) Bash(git symbolic-ref *) Bash(git log *) Bash(git diff *) Bash(git rev-list *) Bash(git switch *) Bash(git push) Bash(git push -u origin *) Bash(printf *) Bash(npx commitlint *) Bash(glab auth status) Bash(glab api user) Bash(glab api projects/:id) Bash(glab api --paginate projects/:id/members/all) Bash(glab api projects/:id/templates/merge_requests*) Bash(glab api projects/:id/merge_requests/*) Bash(glab mr list *) Bash(glab mr create *) Bash(glab mr update *)
---

# Submit Merge Request

Input: $ARGUMENTS

## Rules

- Title MUST be Conventional Commits `<type>(<optional scope>): <subject>`, MUST be ≤72 chars, MUST be imperative ("add", not "added"). Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert. Repo commitlint config → source of truth; check `printf '%s\n' '<title>' | npx commitlint`.
- `glab mr update` `--remove-source-branch`/`--squash-before-merge` are toggles: never use them. Set both via `glab api projects/:id/merge_requests/<iid> -X PUT -F remove_source_branch=<bool> -F squash=<bool>`.
- Description always via `--description-file -` + quoted heredoc (`<<'EOF'`); backticks and `$` stay literal.
- Never `--force`, `--no-verify`, commit, stash, or reset. Never clear existing reviewers or assignees silently.
- Issue → check `## Known issues` first. Fix for a recurring or workflow-blocking issue → append `- <symptom> → <fix>` to source SKILL.md (repo path, not plugin cache); not writable → print line for user.

## Workflow

1. Pre-flight. `glab auth status` fail → stop, tell user `glab auth login`. `glab api projects/:id` fail (origin not a GitLab project) → report exact error line, stop; keep response for step 12. Current = `git rev-parse --abbrev-ref HEAD`; `HEAD` (detached) → stop.
2. Remote branches: `git fetch --prune origin`; fail → report exact error line, stop. List `git for-each-ref --sort=-committerdate --format='%(refname:short)' refs/remotes/origin`; drop `origin/HEAD`, `origin`. Default = `git symbolic-ref --short refs/remotes/origin/HEAD` (unset → `origin/main` if listed).
3. Reviewer pool: `glab api --paginate projects/:id/members/all`; keep `state=active`, `access_level ≥ 30` (Developer+); dedupe by `id`. Self = `glab api user` (`id`, `username`); drop self from pool.
4. Branches. One AskUserQuestion, two questions, 2–4 options each, most recent first:
   - Source: current first "(Recommended)", even if never pushed; then remote branches.
   - Target: input branch if listed, else default first "(Recommended)"; never = source.
   - Other → validate `git rev-parse --verify --quiet origin/<name>`; invalid or source = target → re-ask.
5. Switch. Source ≠ current: `git status --porcelain=v1 --untracked-files=no` non-empty → stop, suggest `/cdk:commit-changes`. Else `git switch <source>` (auto-tracks `origin/<source>`). Fail → report exact error line, stop.
6. Push. No upstream (`git rev-parse --abbrev-ref @{u}` fails) → `git push -u origin <source>`. Else `git rev-list --count @{u}..HEAD` > 0 → AskUserQuestion: Push (Recommended, MR shows only pushed commits) | Skip; yes → `git push`. Fail → report exact error line, stop.
7. Existing MR: `glab mr list --source-branch <source> -F json` (open MRs). Match → update path (keep `iid`, `title`, `description`, `assignees`, `reviewers`, `target_branch`). None → create path.
8. Collect changes (pushed state): `git log --format='%h %s' origin/<target>..origin/<source>`, `git diff --stat origin/<target>...origin/<source>`. Empty → stop, report "no changes vs <target>".
9. Template.
   - Sources in order: repo `.gitlab/merge_request_templates/*.md`; else `glab api projects/:id/templates/merge_requests` (`[{key,name}]`, includes group/instance), content via `glab api projects/:id/templates/merge_requests/<key>` (`.content`; URL-encode key, space → `%20`); else bundled `${CLAUDE_SKILL_DIR}/templates/*.md`.
   - Infer kind: input names template → use it. Else branch prefix/dominant commit type: `fix/`→Bugfix, `hotfix/`→Hotfix, `release/`→Release, `docs/`→Documentation, other→Default. Map to closest available name (case-insensitive).
   - One template available → use it, no ask. Else AskUserQuestion: inferred "(Recommended)" + up to 3 others.
   - Fill sections from step 8 commits/diff and linked issues in commit subjects. Keep headings and checklists; replace comments with content; drop comments you cannot fill. Strip quick actions (`/assign`, `/label`, …); later steps set those explicitly.
   - Update path → AskUserQuestion: Keep existing description (Recommended, preserves manual edits) | Refill from template. Show first lines of both.
10. Title. Draft from step 8: one commit → its subject; many → dominant type + imperative summary. Update path: keep existing title only if it passes all title rules. Show title → AskUserQuestion: Use (Recommended) | Revise. Revised → re-check, re-ask until valid.
11. Assignee: create → self. Update → `assignees` empty → self; else unchanged.
12. Reviewers. Order pool: current reviewers first, then `access_level` desc, then `username`. Take first 16. Split into up to 4 `multiSelect: true` questions of 2–4 users each, balanced (5 → 3+2; never 1). Pool of 1 → one question: `@username` | No reviewer. Label `@username`, description `name — <role>`; mark current "(current)". Other → typed usernames, each must be in pool, else re-ask. Pool empty → skip, report. Update path + nothing selected → keep current reviewers.
13. Merge options from step 1 project response. Delete source branch: AskUserQuestion Yes | No; `remove_source_branch_after_merge` true → Yes "(Recommended, project default)", else No "(Recommended, project default)". Squash by `squash_option`: `always`/`never` → enforced, skip ask, report value; `default_on` → Yes "(Recommended, project default)" | No; `default_off` → No "(Recommended, project default)" | Yes. Ask both in one AskUserQuestion when both needed.
14. Submit. Title with `'` → escape as `'\''` inside single quotes. Create: `glab mr create -s <source> -b <target> -t '<title>' -a <self> [--reviewer <u1,u2>] --remove-source-branch=<bool> [--squash-before-merge=<bool>] -y --description-file - <<'EOF'` … `EOF`; squash enforced → omit flag. Update: `glab mr update <iid> -t '<title>' [-a <self>] [--reviewer <u1,u2>] [--target-branch <target>] -y [--description-file - <<'EOF'` … `EOF]`; `--reviewer` without prefix replaces list, so pass full selection; `--target-branch` only if changed; description only if Refill. Then `glab api projects/:id/merge_requests/<iid> -X PUT -F remove_source_branch=<bool> [-F squash=<bool>]`. Fail → report exact error line, diagnose, fix, retry once; still failing → stop.
15. Verify: `glab api projects/:id/merge_requests/<iid>`. Check `title` passes rules; `source_branch`, `target_branch`, `assignees`, `reviewers` match; `force_remove_source_branch`, `squash` match chosen values (enforced squash → skip). Mismatch → report field, stop.

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
```

## Known issues

- Nested list under a 2-digit step broke numbering after `npm run format` → keep steps ≥10 as single paragraphs.
