# Flow

Details for the SKILL.md steps. Practices: `practices.md`.

## Contents

- Clarify (step 3) · Draft (step 5) · Dockerfile (step 8) · Open items (step 10)

## Clarify (step 3)

AskUserQuestion, recommended option first with the reason; derivable facts and facts the input gives are never asked.

- Call 1:
  - Services, three multiSelect questions: "Databases" (PostgreSQL, MySQL, MariaDB, MongoDB), "Cache and messaging" (Redis, Valkey, RabbitMQ, Kafka), "Search and dev tools" (OpenSearch, Elasticsearch, Mailpit, LocalStack). Catalog services with analyzer evidence get "(Recommended)" and their evidence; the analyzer's `Other services` are named in the first question's text, to add via "Other". An "Other" service resolves to its official Docker Hub image (none found → call 3). Nothing selected → no services.
  - Claude Code: Yes, no firewall (Recommended; feature, sign-in volume, Codespaces secrets) | Yes, with firewall (egress allowlist; adds NET_ADMIN and NET_RAW, needs a Dockerfile, blocks unlisted registries) | No.
- Approach: no question; derive per practices.md `## Approach` from call 1 and report it with the reason.
- Call 2, each question only when it applies:
  - Docker access, when the analyzer says `Builds images: yes`: None (Recommended; least access) | docker-outside-of-docker (host daemon) | docker-in-docker (privileged).
  - Stack and runtime version, when `Empty: yes` or the version is not derivable.
  - Config to update, when update mode found more than one config.
- Call 3: only for gaps left after call 2 and failed step 4 lookups (step 4 re-runs for the answers).

## Draft (step 5)

Per practices.md:

- devcontainer.json: `name` (repo dir name), `image`, `build`, or `dockerComposeFile` + `service` + `workspaceFolder`, `features`, `forwardPorts`, `mounts`, `containerEnv`, `remoteEnv`, `postCreateCommand`, `secrets`, `customizations.vscode.extensions`, plus `capAdd`, `postStartCommand`, and `waitFor` for the firewall.
- Compose: `.devcontainer/compose.yaml` (extending the repo's compose file when one exists), `.devcontainer/.env.example`, `.devcontainer/.env`, `.gitignore` entry.
- `.gitattributes` LF rule when missing; firewall → `.devcontainer/init-firewall.sh` from the reference.
- Dockerfile needed → the `cdk:build-dockerfile` arguments per practices.md `## Dockerfile handoff`.
- Update mode → keep the existing config's intent (approach, features, customizations, commands), add only what step 3 chose, fix what breaks a practice (`appPort`, Compose `ports`, `latest` tags, mounted host secrets); list each change with its reason.

## Dockerfile (step 8)

Invoke `cdk:build-dockerfile` through the Skill tool with the step 5 arguments, in this main thread (never via the Agent tool; it asks the user itself). Invoking this skill is the user's explicit request for it.

- Read its Output `Result:`. `done` or `nothing-to-do` → keep its `App:`, `Stages:` (the base digest), `Files:`, and `Checks:` lines, and confirm `<App dir>/Dockerfile` matches `build.dockerfile` (or the Compose `app` `build`); fix the reference when it differs.
- `stopped` or `cancelled` → go to step 10 with what is left, then print `Stopped: 8: build-dockerfile <its Stopped>`.

## Open items (step 10)

Sources: `Checks:` failures, `Checks:` not installed, `Skipped practices:`, analyzer `Gaps:`, the chained build-dockerfile `Open:` lines.

- Fix once, in files this skill wrote only, each fix printing its diff; never re-enter the step 9 loop. A Dockerfile check failure is reported with the recommended `cdk:build-dockerfile` input, never fixed here.
- Whatever is left goes in `Open:` as `<item: impact; recommended fix>`; accepted skips stay in `Skipped practices:`.
