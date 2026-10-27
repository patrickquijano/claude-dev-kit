# Evals

Test each case on Haiku, Sonnet, and Opus; a case passes only when every `pass` line holds. Record failures by id and model.

## Template

```text
id: <kebab-case>
kind: routing | behavior
prompt: <the exact user message>
expected: <route or behavior>
pass: <observable criteria, one per line>
```

## Routing cases

- `route-gitlab-ci`: "Set up GitLab CI for this Go service."
  - Expected: This skill
  - Pass: Loads the skill; writes only `.gitlab-ci.yml` and `.gitlab/ci/*.gitlab-ci.yml`
- `route-not-github`: "Add a GitHub Actions workflow that runs tests."
  - Expected: Not this skill
  - Pass: Does not load this skill; no file under `.gitlab/`
- `route-not-compose`: "Write a Docker Compose file for local development."
  - Expected: Not this skill
  - Pass: Does not load this skill; no pipeline file written

## Behavior cases

- `create-node`: "Write a GitLab pipeline for this Node repo." (no pipeline yet)
  - Expected: Discovers commands, resolves images, plans, writes
  - Pass: Plan mode first; thin root with one flat `local` include; one file per job; every `image:` has a resolved full tag; no `latest`
- `update-minimal`: "Add a lint job to .gitlab-ci.yml." (existing pipeline)
  - Expected: Minimal diff
  - Pass: Existing includes, variables, and job names unchanged; diff shown in the plan
- `defaults-omitted`: "Add a test job with caching."
  - Expected: Only non-default keys
  - Pass: No `cache:policy: pull-push`, no `when: on_success`; `expire_in` on report artifacts
- `posix-inline`: "Add a build job that runs our scripts/build.sh."
  - Expected: Asks about inlining; inline commands are POSIX
  - Pass: No `[[`, `source`, arrays, or `pipefail`; no call to an external script unless the user declined inlining
- `offline-images`: "Pin the images." (no network, no tools)
  - Expected: Never recalls a tag
  - Pass: The tag is left visible; `Images:` shows unresolved; `Unverified:` lists it
- `dotnet-registry-image`: "Write a GitLab pipeline for this .NET repo." (no crane, skopeo, or regctl)
  - Expected: Pins `mcr.microsoft.com/dotnet/sdk` from the script's registry API
  - Pass: The script ran for that image; the `image:` carries the resolved full tag, no `latest`; no tag is recalled
- `plan-declined`: "Write CI." (plan mode declined)
  - Expected: Writes nothing
  - Pass: `Result: stopped`, `Stopped: 0: plan mode declined`
- `fix-cap`: "Write CI." (a lint finding persists)
  - Expected: Stops after 3 rounds
  - Pass: Each round enters plan mode before any edit; finding under `Open:`
- `cannot-interact`: "Write CI." (run as a subagent)
  - Expected: Asks nothing, writes nothing
  - Pass: `Result: stopped`, `Stopped: <step>: cannot interact`
