# GitLab conventions

Host section of `cdk:prepare-change-request`, `cdk:review-change-request`, and `cdk:address-change-request-review` (host = any `origin` host other than `github.com`); the GitHub counterpart is `github.md`. A change request here is a merge request.

## Pre-flight

Run in order; the linking skill names which values it keeps.

1. `git rev-parse --is-inside-work-tree` = `true`; Root = `git rev-parse --show-toplevel`.
2. Branch = `git rev-parse --abbrev-ref HEAD`; `HEAD` (detached) → stop.
3. `glab auth status` fails → stop, tell user `glab auth login`.
4. `glab api projects/:id` fails (origin is not a GitLab project) → report the exact error line, stop. Keep the response as Project (`id`, `path_with_namespace`, `default_branch`, `remove_source_branch_after_merge`, `squash_option`).
5. Self = `glab api user` (`id`, `username`).
6. Scratch = `mktemp -d` (request bodies, message files, API dumps).
7. `git status --porcelain=v1` non-empty → note "uncommitted changes excluded" for the Output and continue.

## Remote branches

1. `git fetch --prune origin`; fail → report the exact error line, stop.
2. `git for-each-ref --sort=-committerdate --format='%(refname:short)' refs/remotes/origin`; drop `origin/HEAD`, `origin`, and the current branch's ref.
3. Default = `git symbolic-ref --short refs/remotes/origin/HEAD` when it is in the list; unset → `origin/main`, else `origin/master`, if listed; else none.

Every ref is on `origin`, which is the project `glab` targets.

## Identity

- Source = current branch, target = selected target branch (branch part only).
- `glab mr list --source-branch <source> -F json` (open MRs). One match → update (keep `iid`, `title`, `description`, `assignees`, `reviewers`, `target_branch`, `force_remove_source_branch`, `squash`); none → create; more → stop and list them.
- `glab mr list` may omit fields; read the full MR with `glab api -X GET projects/:id/merge_requests/<iid>`.

## Templates

First hit wins; search names case-insensitively.

1. `--template <v>`: a repo `.gitlab/merge_request_templates/<v>.md` (`git ls-files`), else a template of that name from `glab api projects/:id/templates/merge_requests` (`[{key,name}]`, includes group/instance), else an existing file path outside the repo tree. Not found → stop (never fall back silently).
2. Inferred kind (the SKILL.md template step) among the repo `.gitlab/merge_request_templates/*.md`, then among the `glab api projects/:id/templates/merge_requests` names.
3. Repository default: the repo or API template named `Default`, else the only one available.
4. Bundled `${CLAUDE_SKILL_DIR}/assets/templates/<Kind>.md` (`Default` when no kind matches).

Content of an API template: `glab api projects/:id/templates/merge_requests/<key>` (`.content`; URL-encode the key, space → `%20`). Read a tracked repo template with `git show HEAD:<path>`; read an external `--template` path or the bundled fallback with Read. Source label for the Output: `explicit`, `repository` (repo or group/instance), or `bundled`.

## Managed section

- Markers: `<!-- prepare-change-request:start -->` and `<!-- prepare-change-request:end -->`, each on its own line. An MR description written by the earlier `prepare-merge-request` skill has none; the block is appended.
- The orchestrator writes review results only between them: summary, per-role status and counts, commands with exit codes, medium and low findings, limitations.
- Update: replace the text between the markers; no markers → append the block after one blank line. Everything outside the markers stays byte-identical (read `description` from the full MR JSON, not from memory).
- Exactly one start and one end marker, in order; anything else → stop, ask the user to repair the description.
- Quick actions (`/assign`, `/label`, …) never appear in the body; later steps set those fields explicitly.

## Write

Only the confirmed effects, in order.

1. Push: `git push -u origin HEAD:<source>`.
2. Create: `glab mr create -s <source> -b <target> -t '<title>' -a <self> [--reviewer <u1,u2>] [--draft] -y --description-file - <<'EOF'` … `EOF`; keep the new `iid`.
3. Update: `glab mr update <iid> [-t '<title>'] [-a <self>] [--reviewer <u1,u2>] [--target-branch <target>] [--draft | --ready] -y --description-file - <<'EOF'` … `EOF`. `--reviewer` without a prefix replaces the list, so pass the full selection; `--target-branch` only when changed.
4. Merge options, create and update alike: `glab api projects/:id/merge_requests/<iid> -X PUT -F remove_source_branch=<bool> [-F squash=<bool>]`; squash enforced → omit `-F squash`. Never pass `--remove-source-branch` or `--squash-before-merge` to `glab mr create` or `glab mr update`.

Write the body to `<scratch>/body.md` first and feed it through the quoted heredoc; backticks and `$` stay literal. A title containing `'` is escaped as `'\''` inside single quotes.

Merge options default: update → the MR's current `force_remove_source_branch` and `squash`; create → delete source = Project `remove_source_branch_after_merge`; squash by Project `squash_option`: `always`/`never` → enforced, `default_on` → yes, `default_off` → no. `--squash` and `--delete-branch` win, except an enforced squash always wins (note it).

Typed reviewer usernames must be active project members (`glab api --paginate projects/:id/members/all`, `state=active`), else re-ask.

## Verify

`glab api -X GET projects/:id/merge_requests/<iid>`: `title` passes the title rules; `source_branch`, `target_branch`, `assignees`, `reviewers` match; `force_remove_source_branch` and `squash` match the chosen values (enforced squash → skip); `draft` as requested; both markers present once, and on update the text outside the markers equals the pre-write description.

## API rules

- Read MR endpoints only as `glab api -X GET projects/:id/merge_requests/…` or `glab api -X GET --paginate projects/:id/merge_requests/…`; none is pre-approved, so each read gets a permission prompt.
- A command that starts with `glab api -X GET` never carries a second `-X`/`--method`; the last method flag wins, so it would turn a read into a write.
- Writes (POST, PUT, DELETE, graphql) always start `glab api <endpoint> -X <METHOD>`, never with the `-X GET` prefix, so each one gets a permission prompt as a second confirmation.
- JSON request bodies go to a scratch file and `--input <file>`; never inline user or model text in shell args. `-f`/`-F` only for API-sourced values (SHAs, ids) or fixed literals.
