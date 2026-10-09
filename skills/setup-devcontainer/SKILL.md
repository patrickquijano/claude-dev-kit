---
name: setup-devcontainer
description: Set up or update a Dev Container (.devcontainer/devcontainer.json, Codespaces config) for the current repository. Detect stacks, versions, ports, and the services the code uses, ask which databases, caches, queues, or dev tools to add and whether to include Claude Code and its firewall, derive the image, Dockerfile, or Docker Compose approach, write pinned config, and verify with devcontainer read-configuration. Use only when the user explicitly asks to set up, create, add, or update a devcontainer, dev container, devcontainer.json, or Codespaces config. Do not use on your own after finishing a task.
argument-hint: '[stack, services, or notes]'
allowed-tools: Bash(git rev-parse *) Bash(command -v *) Bash(devcontainer read-configuration *) Bash(docker compose -f * config --quiet) WebFetch(domain:hub.docker.com) WebFetch(domain:mcr.microsoft.com) WebFetch(domain:raw.githubusercontent.com) WebFetch(domain:marketplace.visualstudio.com)
---

# Setup Devcontainer

Input: $ARGUMENTS

## Rules

- User interaction (AskUserQuestion) only here; writes only here or in the chained `cdk:write-dockerfile`; `cdk:devcontainer-analyzer` only reads.
- Apply `${CLAUDE_SKILL_DIR}/practices.md`; each item says why. Skipped item → reason in the Output.
- No invented facts: stack, versions, commands, ports, and env vars come from the input or the repo; image tags, feature majors, service ports, data paths, env vars, and health commands come from the lookups practices.md names. Lookup fails → ask in step 3 call 3; never guess.
- Pinning per practices.md: image approach at the image major tag, features at `:<major>` with the committed `devcontainer-lock.json`, service images at an exact release tag; a Dockerfile base at the exact full tag plus digest, as `cdk:write-dockerfile` requires.
- Dockerfile needed (system packages, firewall, or a custom build step) → chain `cdk:write-dockerfile` per `${CLAUDE_SKILL_DIR}/../ship-changes/orchestration.md`, for any approach; never write or fix the Dockerfile here.
- Credentials never land in git: `.devcontainer/.env` is gitignored and dockerignored, `.env.example` holds placeholders.
- Every write to an existing file prints its diff; no approval asked, since the files are local and the diff is reviewable.
- Loops: clarify (step 3) max 3 AskUserQuestion calls; verify-fix (step 9) max 3 attempts. Cap hit, or any failure → print the Output with `Stopped: <step>: <reason>` and end.
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/fallbacks.md`.
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `setup-devcontainer`; it covers the analyzer's `Known issue:` lines.

## Workflow

1. **Pre-flight.** Root = `git rev-parse --show-toplevel`, else cwd. Mode: `.devcontainer/devcontainer.json`, `.devcontainer.json`, or `.devcontainer/*/devcontainer.json` exists → update; else create. Update → read each config and the files it references (Dockerfile, compose files) fully.
2. **Analyze.** Spawn `cdk:devcontainer-analyzer` with the root. Use its Return for every later step.
3. **Clarify.** AskUserQuestion, recommended option first with the reason; derivable facts and facts the input gives are never asked.
   - Call 1:
     - Services, three multiSelect questions: "Databases" (PostgreSQL, MySQL, MariaDB, MongoDB), "Cache and messaging" (Redis, Valkey, RabbitMQ, Kafka), "Search and dev tools" (OpenSearch, Elasticsearch, Mailpit, LocalStack). Catalog services with analyzer evidence get "(Recommended)" and their evidence; the analyzer's `Other services` are named in the first question's text, to add via "Other". An "Other" service resolves to its official Docker Hub image (none found → call 3). Nothing selected → no services.
     - Claude Code: Yes, no firewall (Recommended; feature, sign-in volume, Codespaces secrets) | Yes, with firewall (egress allowlist; adds NET_ADMIN and NET_RAW, needs a Dockerfile, blocks unlisted registries) | No.
   - Approach: no question; derive per practices.md `## Approach` from call 1 and report it with the reason.
   - Call 2, each question only when it applies:
     - Docker access, when the analyzer says `Builds images: yes`: None (Recommended; least access) | docker-outside-of-docker (host daemon) | docker-in-docker (privileged).
     - Stack and runtime version, when `Empty: yes` or the version is not derivable.
     - Config to update, when update mode found more than one config.
   - Call 3: only for gaps left after call 2 and failed step 4 lookups (step 4 re-runs for the answers).
4. **Look up** per practices.md: base image tag, feature majors, and each service's tag, port, data directory, env vars, and health command. Failure → call 3; call 3 already used → stop.
5. **Draft.** Per practices.md:
   - devcontainer.json: `name` (repo dir name), `image`, `build`, or `dockerComposeFile` + `service` + `workspaceFolder`, `features`, `forwardPorts`, `mounts`, `containerEnv`, `remoteEnv`, `postCreateCommand`, `secrets`, `customizations.vscode.extensions`, plus `capAdd`, `postStartCommand`, and `waitFor` for the firewall.
   - Compose: `.devcontainer/compose.yaml` (extending the repo's compose file when one exists), `.devcontainer/.env.example`, `.devcontainer/.env`, `.gitignore` entry.
   - `.gitattributes` LF rule when missing; firewall → `.devcontainer/init-firewall.sh` from the reference.
   - Dockerfile needed → the `cdk:write-dockerfile` arguments per practices.md `## Dockerfile handoff`.
   - Update mode → keep the existing config's intent (approach, features, customizations, commands), add only what step 3 chose, fix what breaks a practice (`appPort`, Compose `ports`, `latest` tags, mounted host secrets); list each change with its reason.
6. **Plan.** Print each file's content (diff for existing files), the handoff arguments, and the change list. Nothing to add or fix in update mode → `Result: nothing-to-do`; skip to step 10.
7. **Write** the step 5 files without asking (existing `.gitignore` and `.gitattributes` → append only missing lines). They come first, so the Dockerfile's `COPY` sources exist when it is reviewed.
8. **Dockerfile.** Dockerfile needed → invoke `cdk:write-dockerfile` via the Skill tool with the step 5 arguments. Read its Output: `Result: done` or `nothing-to-do` → keep its `App:`, `Stages:` (the Base digest), `Files:`, and `Checks:` lines, and confirm `<App dir>/Dockerfile` matches `build.dockerfile` (or the Compose `app` `build`), fixing the reference when it differs; else stop per orchestration.md, `Stopped: 8: write-dockerfile <its Stopped>`.
9. **Verify.** Run the practices.md `## Checks` the host supports (analyzer `CLIs`). Each failure in a file this skill wrote → fix, print the diff, re-run (cap in Rules); a Dockerfile failure → report it, never fix it here. `devcontainer up` only when the user asks.
10. **Report** the output below.

## Output

```text
Mode: create | update
Config: <devcontainer.json path>
Approach: image | dockerfile | compose | compose + dockerfile — <reason>
Base: <image:tag[@digest]>
Features: <id:major>, … | none
Services: <name image:tag (healthcheck | no healthcheck)>, … | none
Claude Code: <feature + volume | no>, firewall <yes | no>
Docker access: none | docker-outside-of-docker | docker-in-docker
Files: <path (written | updated | kept)>, …
Changes: <change — reason>, … | none
Skipped practices: <item — reason> | none
Checks: JSON <pass | fail>, read-configuration <pass | fail | not installed>, compose config <pass | fail | not installed | n/a>, write-dockerfile <its Checks | n/a>
Next: <item>, … | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```

`Next:` items: `cp .devcontainer/.env.example .devcontainer/.env` on fresh clones (Compose); commit `devcontainer-lock.json` after the first build; the trusted-repositories warning (Claude Code); firewall allowlist edits for the stack's registries (firewall).
