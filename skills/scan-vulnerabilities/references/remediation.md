# Remediation

Used by `cdk:scan-vulnerabilities` steps 3 and 6–7.

## Validation commands

Detect them once, in this order, and list them in `manifest.json` `baseline`:

1. Commands named in the repo's `CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`, or CI config (`.gitlab-ci.yml`, `.github/workflows/`).
2. Manifest scripts: `package.json` scripts `build`, `typecheck`, `type-check`, `tsc`, `test`, `test:unit`, `test:integration`, `test:e2e`, run with the detected package manager; `Makefile` targets `build`, `test`, `test-unit`, `test-integration`, `e2e`; `composer.json` `test`.
3. Stack defaults, only when the manifest exists and the tool is installed (`command -v`): `go build ./...`, `go test ./...`; `cargo build`, `cargo test`; `mvn -B -q verify`; `./gradlew build`; `dotnet build`, `dotnet test`; `pytest` with a pytest config; `mypy` or `pyright` with a config; `tsc --noEmit` with a `tsconfig.json`.

Exclude every lint, format, fmt, style, prettier, eslint, stylelint, or `*:fix` command, and any command that deploys, publishes, releases, migrates, seeds, or reaches production. A command that needs credentials or a service that is not running gets status `unavailable` with the reason.

Order per validation: install from the lockfile (`npm ci`, `pnpm install --frozen-lockfile`, `poetry install --sync`, …) only when a lockfile changed (this runs the new packages' install scripts on the host; list that under validation limitations), then build, type check, unit, integration, e2e, targeted tests for the changed files, then the targeted rescan.

A remediation fails validation when a command that passed at baseline now fails, or when a test that passed at baseline now fails. A command that already failed at baseline counts only by its new failures. Name pre-existing failures as pre-existing; never attribute them to the remediation.

## Checkpoint

Before each attempt:

```bash
CP=$(git stash create); [ -n "$CP" ] || CP=$(git rev-parse HEAD)   # no change to the tree, index, or stash list
CK="$RUN/iteration-<n>/checkpoints/R<i>.<k>"; mkdir -p "$(dirname "$CK")"
git status --porcelain=v1 > "$CK.status"
git ls-files --others --exclude-standard > "$CK.untracked"
git rev-parse --abbrev-ref HEAD > "$CK.branch"
echo "$CP" > "$CK.sha"   # shell variables do not survive between Bash calls
```

`.specify/memory/` is excluded from rollback, so a constitution created during the attempt is kept for later attempts.

Protected paths = files that were dirty or untracked at pre-flight. A remediation that must touch one gets `needs-approval` (`touches uncommitted user changes`). Rollback cannot separate the user's edits from the fix in that file.

## Brief for cdk:run-spec-kit

Pass the brief below. It has no guiding-principles part, so run-spec-kit does not ask to update a filled constitution. An unfilled constitution is inferred without asking; it is written once and `.specify/memory/` survives rollback. The constraints sit in the what-and-why part instead. Never include a secret value; cite file, line, and rule.

```text
What and why: Remediate <title> (<ids>, <severity>) at <file:lines | package@version via manifest>. Risk: <one line>. Done when <scanners> no longer report <rule or id> there and the existing build and tests pass. Constraints: smallest atomic change; preserve existing behavior, architecture, public interfaces, data contracts, backward compatibility, and security controls; do not modify generated, vendored, compiled, minified, or third-party files; no breaking dependency upgrades; do not weaken, skip, or delete tests; do not add or run linters, formatters, or code-style tools.

Implementation detail: <the verified fix, e.g. "bump <pkg> <from> → <to> in <manifest> with `<manager command>` and refresh <lockfile>", or "replace <unsafe call> with <safe call> at <file:line>">. Change only: <files>.
```

## Branch

A Spec Kit git hook may create and switch to a feature branch during `speckit-specify`. After each attempt, compare `git rev-parse --abbrev-ref HEAD` with `$CK.branch`. If it differs, log the new branch in `remediation-log.md` and `manifest.json`, and keep working on it: the uncommitted changes moved with it. Never switch back, merge, or delete branches. The Output lists every branch created, and step 10 ships the current one.

## Fix rules by category

- Dependency: target the lowest version ≥ a fixed version within the current major (0.x: within the current minor). Prefer the latest such version when it is also unaffected. Use the package manager's command so the lockfile stays in sync. Transitive: bump the direct parent within its major; else add an override (`overrides`, `resolutions`, `pnpm.overrides`, `constraints`) only within the resolved version's major. A fix only in a new major, or a replaced or removed major dependency → `needs-approval`.
- SAST: change the flagged code to the safe API or pattern the rule documents. Changes to authentication or authorization behavior, public signatures, or data formats → `needs-approval`.
- Secret: always `manual`, because fixing one means reading the line that holds the value. Manual actions: `move the <rule> value at <file:line> to the project's config mechanism (env var or secret store)` and `rotate the credential`, because the value was exposed. A secret in history also needs `purge from history` (destructive; never automated).
- IaC, image, Kubernetes: change the declaration to the secure setting when it does not alter runtime behavior. Base image bumps stay within the same distro and major tag. Network, permission, or resource changes that alter runtime → `needs-approval`.
- DAST: fix in the app source (headers, cookie flags, input handling). Never change the target environment.

## Rollback

On a failed attempt, revert only that attempt:

```bash
CK="$RUN/iteration-<n>/checkpoints/R<i>.<k>"; CP=$(cat "$CK.sha"); [ -n "$CP" ] || exit 1
git diff --name-only "$CP" -- . ':!.vulnerability-reports' ':!.specify/memory' |
  while IFS= read -r f; do git restore --source="$CP" --worktree -- "$f"; done
comm -13 <(sort "$CK.untracked") <(git ls-files --others --exclude-standard | sort) |
  grep -v -e '^\.vulnerability-reports/' -e '^\.specify/memory/' | while IFS= read -r f; do rm -- "$f"; done   # only files this attempt created
```

Then check that `git diff --quiet "$CP" -- <changed files>` succeeds. When a lockfile was restored, re-run the frozen install so ignored install output (e.g. `node_modules/`) matches it again. Re-run the failed command to confirm it is back at its baseline result. Never use `git reset --hard`, `git checkout -- .`, `git clean`, `git stash drop`, or any history rewrite. A branch that run-spec-kit created stays; record it and never delete it.

## Attempts

- At most 2 attempts per finding or group. Attempt 2 must use a safer or narrower approach than attempt 1, for example a lower compatible version or a smaller code change.
- A new finding of equal or higher severity in the changed files or packages (rescan `New:`) fails the attempt: roll back.
- Still reported after attempt 2, or validation still fails → status `failed`; keep the rollback; log the evidence and remaining risk.
- A validation failure that baseline already explains is not a failure; continue.
