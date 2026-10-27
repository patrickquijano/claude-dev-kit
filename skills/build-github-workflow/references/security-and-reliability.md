# Security and reliability

Rules for every workflow written or changed.

## Security

- Pin every remote `uses:` to a full commit SHA with a trailing `# vX.Y.Z` comment. Local `./` references take no pin. Keep an existing valid pin on update.
- Set top-level `permissions: contents: read`; grant extra scopes per job, only what that job needs. Never rely on the repository default.
- `actions/checkout` takes `persist-credentials: false` unless the job pushes.
- Pass `${{ github.event.* }}`, `github.head_ref`, and `inputs.*` to scripts through step `env:`; never inside `run:`.
- Never use `pull_request_target` or `workflow_run` to run code from a fork; if a task needs them, list it under `Follow-ups:`.
- Secrets: reference by name from `secrets.*`, scoped to the step that needs them; never echo them. Deploy and release jobs use a named `environment:`. Prefer OIDC (`id-token: write` on that job only) over long-lived cloud keys.
- Reusable workflows: pass secrets explicitly; no `secrets: inherit`.

## Reliability

- `timeout-minutes` on every job that runs steps (not on `uses:` caller jobs).
- `concurrency` with a group per workflow and ref; `cancel-in-progress: true` for CI and PR checks, `false` for deploy and release.
- `paths`/`branches` filters only when the request implies them.
- Cache through the setup action's built-in cache input when it has one.
- `defaults.run.shell` only when the repo already sets one.
- Scheduled workflows: add `workflow_dispatch`, and guard forks with `if: github.repository == '<owner>/<repo>'`.
