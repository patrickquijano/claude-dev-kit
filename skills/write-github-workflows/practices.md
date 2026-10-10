# GitHub Actions workflow practices

Verified 2026-10-10 against docs.github.com, github.com/actions, and github.com/rhysd/actionlint. Items marked **cdk** are plugin policy, not GitHub guidance. Items marked **Required** always apply; apply every other item that fits, and skip one only with a reason in the Output. Doc base: `https://docs.github.com/en/actions/`.

## Reusable-workflow contract

- **Required** one orchestration workflow holds `on:` triggers and caller jobs; each job lives in its own `workflow_call` file. Calls sit directly in a job, never in steps. `reference/workflows-and-actions/reusing-workflow-configurations`, `how-tos/reuse-automations/reuse-workflows`
- A caller job may use only `name`, `uses`, `with`, `secrets`, `strategy`, `needs`, `if`, `concurrency`, `permissions` (the doc's exhaustive list); `environment` is not allowed on it, so the environment goes in the callee. `runs-on`, `steps`, `timeout-minutes`, and `env` are not on that list. Put them in the callee.
- `uses` takes no contexts or expressions. Local call: `./.github/workflows/<file>.yml`, no `@ref` suffix, so the callee is from the caller's commit. Remote call: `{owner}/{repo}/.github/workflows/<file>.yml@{ref}` with a SHA, tag, or branch; the SHA is safest.
- `on.workflow_call.inputs.<id>.type` is required (`boolean`, `number`, `string`). Always write `required` and `default` explicitly: the docs state no default for `required`. Passing an undeclared input or secret is an error.
- `on.workflow_call.secrets.<id>.required` is a boolean. **Required** pass secrets by name, never `secrets: inherit` (**cdk**: explicit lists show exactly what each job can read). Secrets reach only the directly called workflow, so nested calls pass them again. `GITHUB_TOKEN` is available to the callee without passing it.
- `on.workflow_call.outputs.<id>.value` maps a callee job output (`${{ jobs.<job>.outputs.<name> }}`); the caller reads it as `needs.<job>.outputs.<id>`.
- The caller's workflow-level `env` does not reach the callee, and the callee's `env` does not reach the caller. Pass values through `with:` (it may use `vars`, `github`, `inputs`, `needs`), repository or environment `vars`, or outputs.
- The `github` context is the caller's; `github.workflow` is the caller's name. Never set `cancel-in-progress: true` on the same group in caller and callee, or the caller can cancel itself.
- Limits: up to 10 nesting levels, no loops; one file may call at most 50 unique reusable workflows, nested ones included.
- The callee's `GITHUB_TOKEN` permissions can only be kept or reduced, never raised. A caller job with no `permissions` gives the callee the token permissions in effect for the caller (the workflow-level `permissions` when set, else the repository default); this skill always sets both.

## Naming (**cdk**; GitHub states no naming convention)

- Files: orchestrator `<purpose>.yml` (for example `ci.yml`); callees `_<verb>-<noun>.yml`, except the gate `_gate.yml` (underscore prefix groups reusables apart from entry points). Lowercase, hyphen-separated.
- Workflow `name`: Title Case orchestrator name; callee `name` = `'<Orchestrator>: <Job>'`-style short label without the leading underscore, always quoted (an unquoted `:` is a YAML error). Job IDs: lowercase `kebab-case` starting with a letter or `_`, only alphanumerics, `-`, `_` (the doc's rule). Caller job ID = callee job ID where possible, so check names stay stable.
- Step `name`: sentence-case verb phrase. Inputs, outputs, secrets: `snake_case` for inputs/outputs, `UPPER_SNAKE_CASE` for secrets and `env`. Artifacts: `<job>-<what>` with a unique name per run (upload-artifact requires a unique name per run in its current majors; see its README). Environments: lowercase noun (`production`). Concurrency groups: `${{ github.workflow }}-${{ github.ref }}`, adding a scope segment only when one workflow needs several groups.
- Existing repo conventions win over this section (step 2 of the skill collects them).
- **cdk** Required checks: a touched job with a required check gets a gate callee (`_gate.yml`, see `layout.md`) as the one stable check. The caller job `needs` every other job and has `if: ${{ always() }}`; the callee fails when any result is `failure` or `cancelled`, or when there are no results (`skipped` is accepted). Print an old→new check-name map; never edit branch protection or rulesets. The `<caller> / <callee>` check-name format comes from secondary sources, so the map labels it unverified.
- Update mode keeps existing job IDs and `name` values. Modularizing a job can change the check name it reports (the called job's check is shown with the caller's name), so when the analyzer lists required checks for a touched job, add the gate (no question) and report the rename in `Check-name map` and under Retained constraints. The gate supersedes keeping those `name` values.

## Shell

- **Required** POSIX `sh` only: `defaults.run.shell: sh` in each callee, plus `shell: sh` on a step only when a step overrides it. `sh` expands to `sh -e {0}` (only `-e`, no `-u`, no `pipefail`). Start multi-line scripts with `set -eu`. `jobs.<id>.defaults.run`, `reference/workflows-and-actions/workflow-syntax`
- Banned: `[[ ]]`, arrays, `pipefail`, `source`, `function name {`, `local`, `$'…'`, `${var,,}`/`${var//a/b}`, process substitution `<( )`, `==` inside `[ ]`, `echo -e`, `&>`. Use `[ ]` with `=`, `printf`, `.`, `$(…)`, and `case`.
- actionlint runs shellcheck on `run:` when `shellcheck` is on `PATH` and treats the shell as `sh` when the step says so; a shell it cannot determine statically is assumed to be bash, so set it explicitly. `docs/checks.md`, `docs/usage.md` in rhysd/actionlint

## Permissions and tokens

- **Required** orchestrator top-level `permissions: {}` (**cdk** convention; syntax confirmed, doc only says specifying any permission sets the rest to `none`); each caller job grants only what its callee needs; each callee declares its own job-level `permissions` as the same or narrower set. `reference/security/secure-use`, `tutorials/authenticate-with-github_token`
- Cloud access → OIDC with `id-token: write` on that job only, never long-lived cloud keys. `concepts/security/openid-connect`
- `actions/checkout`: **Required** `persist-credentials: false` unless a later step needs authenticated git (default is `true`). Its README recommends `permissions: contents: read`.

## Untrusted input and secrets

- **Required** never put untrusted contexts in `run:` or `with:` script text. `${{ }}` is substituted before the shell runs. Route through a step `env:` variable and use `"$VAR"` double-quoted. Untrusted: issue/PR title and body, comment and review bodies, commit messages, author names and emails, `head_ref`, `pull_request.head.ref`, `head.label`. Preferred over `env` where an action input exists: pass it via `with:`. `reference/security/secure-use`, securitylab.github.com/resources/github-actions-untrusted-input
- Avoid `pull_request_target` and `workflow_run` unless a privileged context is needed; never check out or run fork PR code in them. Treat artifacts from other workflows as untrusted. `reference/security/securely-using-pull_request_target` (checkout's README documents an `allow-unsafe-pr-checkout` input that gates fork PR checkouts there; check the resolved version's README before relying on it).
- Secrets: never plaintext in files, never on a command line (visible to other jobs on the runner), one secret per value (redaction is exact match, so no JSON/YAML blobs), `::add-mask::` for derived sensitive values, scope to the narrowest step `env:`. Leaked secret → rotate.
- Environments: only jobs naming an environment read its secrets and trigger its protection rules; set `environment:` in the callee job, not the caller. `reference/workflows-and-actions/deployments-and-environments`

## Runs, timeouts, concurrency

- **Required** `timeout-minutes` on every callee job (default is 360, which hides hangs); set a value fitted to the job (**cdk**: derived from the repo's observed duration, else ask). Valid on steps too. Not allowed on caller jobs.
- **Required** `concurrency` in the orchestrator (workflow level), group from `github`, `inputs`, `vars` only. `cancel-in-progress: true` for CI on PRs; `false` for deploys and releases. A new queued run cancels a pending run in the same group by default.
- `needs` for ordering; give every dependent job an `if` only when it must run after a failed dependency.

## Cleanup (**cdk**; GitHub publishes no registry-logout guidance)

- **Required** every job that creates credentials, temp files, containers, or logins ends with cleanup steps `if: ${{ always() }}`: `docker logout <registry>`, delete files under `$RUNNER_TEMP` it wrote, remove credential files and `~/.docker/config.json` entries, `docker rm -f` and `docker network rm` for containers it started. `always()` also runs when cancelled, so cleanup steps must be short and idempotent; the doc warns against `always()` on steps whose failure could hang the run (source checkout), and recommends `!cancelled()` when a cancelled run needs no step. `reference/workflows-and-actions/expressions`
- GitHub-hosted runners are ephemeral isolated VMs; self-hosted runners are not, so cleanup is mandatory there and also kept on hosted runners. `reference/security/secure-use`

## Caching and artifacts

- Cache lookup order: exact `key`, `key` prefix, then each `restore-keys` in order. Key on the lockfile hash (`hashFiles(...)`). Branch scope: a run restores its own branch, the default branch, and for PRs the base branch. Never cache secrets or credentials (any reader with repo access can read caches; contents are not verified). Low-trust triggers must stay read-only for caches. `reference/workflows-and-actions/dependency-caching`
- Prefer the setup action's built-in cache over a hand-rolled `actions/cache` when the repo's setup action offers it (**cdk**).
- Cache limits: 10 GB per repo by default, entries unused for 7 days are removed, oldest evicted first.
- **Required** every `upload-artifact` sets `retention-days` (1–90 by default; above 90 needs the repo setting) and a name unique per run (matrix jobs add a matrix key). `include-hidden-files` is `false` by default; keep it, and exclude sensitive paths. Download in dependent jobs with `needs`. Artifacts are immutable (`overwrite` default `false`). github.com/actions/upload-artifact README

## Containers and services

- `container:` and `services:` take a Docker Hub name or full registry path, with optional `credentials`, `env`, `ports`, `options`. GitHub's examples use floating tags. **Required** (**cdk**) exact stable tag, never `latest`, a bare major, or a floating alias; digest added when the repo requires SHA-style pinning. Registry credentials come from secrets, with logout in cleanup. `tutorials/use-containerized-services/use-docker-service-containers`
- Tag and digest resolution: `versions.md`.

## Pinning (**cdk** on top of GitHub guidance)

- Full-length commit SHA is the only immutable reference for an action, and it must come from the action's own repository, not a fork. Tags can be moved or deleted. `reference/security/secure-use`
- Pinning mode comes from `versions.md` `## Pinning mode`: SHA when the repo or org enforces it or existing `uses:` are SHA-pinned; otherwise the most specific exact release tag (`vX.Y.Z`), never a bare major. With a SHA, add a same-line comment `# vX.Y.Z` (Dependabot updates it).
- The `sha_pinning_required` setting exempts reusable workflows, so they may use tags; **cdk** still pins them to the exact tag or SHA.

## Maintenance links

- Re-fetch targets (step 4 of the skill) are the doc pages named in each section above; fetch only those for features the request uses.
