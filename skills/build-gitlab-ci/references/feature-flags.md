# Runner feature flags

Set only the flags the jobs need.

## Steps

1. Find the runner version: `gitlab-runner --version` when installed, else hints in `.gitlab-ci.yml`, README, or runner config in the repo; else ask.
2. Fetch <https://docs.gitlab.com/runner/configuration/feature-flags/>. Offline → no flags are set and the gap goes under `Unverified:`.
3. Choose only the flags that change behavior a job relies on. Skip flags the page marks deprecated, and flags introduced after the runner version.
4. Set each through `variables:`: at the root when every job needs it, else in the one job. A flag at its default is not written.
5. A flag that only works in the runner's `config.toml` cannot be set in CI. Report it as `runner-config-only` in the Output; never edit runner config.
