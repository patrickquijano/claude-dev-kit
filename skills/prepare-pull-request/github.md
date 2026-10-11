# GitHub conventions

Used by `cdk:prepare-pull-request`, `cdk:review-pull-request`, and `cdk:address-pull-request-review` (`## Pre-flight`, `## Command rules`); `cdk:ship-changes` uses `## Pre-flight` steps 5–6.

## Pre-flight

Run in order; any failure → report the exact error line and stop.

1. `git rev-parse --is-inside-work-tree` = `true`.
2. Root = `git rev-parse --show-toplevel`.
3. Branch = `git rev-parse --abbrev-ref HEAD`; `HEAD` (detached) → stop.
4. `git remote` lists at least one remote.
5. `gh auth status` succeeds, else tell the user to run `gh auth login`.
6. `gh repo view --json nameWithOwner,url,sshUrl` returns one repository; keep it as Repo. Fails or the repo cannot be resolved → stop.
7. Self = `gh api user --jq .login`.
8. Scratch = `mktemp -d` (diffs, title, body).
9. `git status --porcelain=v1` non-empty → note "uncommitted changes excluded" for the Output and continue.

## Remote branches

1. `git fetch --all --prune`.
2. `git for-each-ref --sort=-committerdate --format='%(refname) %(symref)' refs/remotes`.
3. Drop lines with a non-empty symref or a refname ending `/HEAD`. Strip `refs/remotes/` to get `<remote>/<branch>`.
4. Drop every ref whose `<branch>` equals the current branch.
5. Keep the order (most recent commit first). Empty list → stop.

A selected ref must belong to a remote whose URL matches Repo's `url` or `sshUrl` (compare after stripping `.git` and the scheme/host form; `git remote get-url <remote>`). Otherwise stop: the PR base would not be in the repository `gh` targets.

## Pull request identity

- Head = current branch, base = selected target branch (branch part only).
- `gh pr list --head <branch> --base <target> --state open --json number,url,title,body,isDraft,assignees,headRepositoryOwner`. `--head` takes a bare branch name; filter results to `headRepositoryOwner.login` equal to Repo's owner. Fork heads are unsupported → stop.
- 0 matches → create; 1 → update; more → stop and list them.

## Templates

First hit wins; search names case-insensitively.

1. `--template <v>`: first resolve a tracked repo path with `git ls-files` (`.github/PULL_REQUEST_TEMPLATE/<v>` or `<v>.md`, case-insensitive); else an existing file path outside the repo tree. Not found → stop (never fall back silently).
2. Repository default: `.github/pull_request_template.md`, `.github/PULL_REQUEST_TEMPLATE.md`, `pull_request_template.md`, `PULL_REQUEST_TEMPLATE.md`, `docs/pull_request_template.md`.
3. `${CLAUDE_SKILL_DIR}/templates/default.md`.

Read a tracked repo template with `git show HEAD:<path>` (path resolved via `git ls-files`) so uncommitted edits never change the body; read an external `--template` path or the bundled fallback with Read.

## Managed section

- Markers: `<!-- prepare-pull-request:start -->` and `<!-- prepare-pull-request:end -->`, each on its own line.
- The orchestrator writes review results only between them: summary, per-role status and counts, commands with exit codes, medium and low findings, limitations.
- Update: replace the text between the markers; no markers → append the block after one blank line. Everything outside the markers stays byte-identical (read the body from the `gh pr list` JSON, not from memory).
- Exactly one start and one end marker, in order; anything else (duplicate, missing end) → stop, ask the user to repair the body.

## Command rules

- Reads: `gh pr list`, `gh pr view`, `gh repo view`, `gh api user`, `gh auth status` only.
- Writes happen only in the orchestrator's write step: `git push`, `gh pr create`, `gh pr edit`, `gh pr ready`. None is pre-approved, so each gets a permission prompt.
- Text goes through scratch files: `-F <scratch>/body.md` for the body; a title containing `'` is escaped as `'\''` inside single quotes. Never inline body text in shell args.
