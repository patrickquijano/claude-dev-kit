---
name: setup-devcontainer
description: Set up or update a Dev Container (.devcontainer/devcontainer.json, Codespaces config). Detect stacks, versions, ports, and services, ask which databases and tools to add, write pinned config, and verify it. Use only when the user explicitly asks to set up or update a devcontainer or Codespaces config. Do not use on your own after finishing a task.
argument-hint: '[stack, services, or notes]'
allowed-tools: Bash(git rev-parse *) Bash(command -v *) Bash(devcontainer read-configuration *) Bash(docker compose -f * config --quiet) WebFetch(domain:hub.docker.com) WebFetch(domain:mcr.microsoft.com) WebFetch(domain:raw.githubusercontent.com) WebFetch(domain:marketplace.visualstudio.com)
---

# Setup Devcontainer

Input: $ARGUMENTS

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

A Context value of `<none>` means that read failed. A missing value or `[shell command execution disabled by policy]` means run that command's `commands.md` row instead.

## Rules

- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- User interaction (AskUserQuestion) only here; writes only here or in the chained `cdk:write-dockerfile`; `cdk:devcontainer-analyzer` only reads.
- Apply `${CLAUDE_SKILL_DIR}/references/practices.md`; each item says why. Skipped item → reason in the Output.
- No invented facts: stack, versions, commands, ports, and env vars come from the input or the repo; image tags, feature majors, service ports, data paths, env vars, and health commands come from the lookups practices.md names. Lookup fails → ask in step 3 call 3; never guess.
- Pinning per practices.md: image approach at the `<image major>-…` tag per practices.md `## Images`, features at `:<major>` with the committed `devcontainer-lock.json`, service images at an exact release tag; a Dockerfile base at the exact full tag plus digest, as `cdk:write-dockerfile` requires.
- Dockerfile needed (system packages, firewall, or a custom build step) → chain `cdk:write-dockerfile` per `${CLAUDE_SKILL_DIR}/../shared/references/orchestration.md`, for any approach; never write or fix the Dockerfile here.
- Credentials never land in git: `.devcontainer/.env` is gitignored and dockerignored, `.env.example` holds placeholders.
- Every write to an existing file prints its diff; no approval asked, since the files are local and the diff is reviewable.
- Loops: clarify (step 3) max 3 AskUserQuestion calls; verify-fix (step 9) max 3 attempts. Any stop from step 2 onward (clarify cap, lookup failure, step 8 stop, verify cap) → run step 10 (**Resolve findings.**) on what is left, without re-entering the loop, then print the Output with `Stopped: <step>: <reason>` and end; only a step 1 stop and cancels skip step 10 and print `Resolution: not run (stopped | cancelled)`.
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/../shared/references/fallbacks.md`.
- Final step: follow `${CLAUDE_SKILL_DIR}/../shared/references/resolve-findings.md` (scope: edit; sources: `Checks:` failures, `Checks:` not installed, `Skipped practices:`, analyzer `Gaps:`).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../shared/references/known-issues.md` with slug `setup-devcontainer` and store `${CLAUDE_PLUGIN_DATA}/known-issues`; it covers the analyzer's `Known issue:` lines.

## Workflow

1. **Pre-flight.** Root = Context → Repo root, `<none>` → cwd. Mode: `.devcontainer/devcontainer.json`, `.devcontainer.json`, or `.devcontainer/*/devcontainer.json` exists → update; else create. Update → read each config and the files it references (Dockerfile, compose files) fully.
2. **Analyze.** Spawn `cdk:devcontainer-analyzer` with the root. Use its Return for every later step.
3. **Clarify.** AskUserQuestion, recommended option first with the reason; derivable facts and facts the input gives are never asked. Call 1: services and Claude Code (approach derived, no question); call 2: only the questions that apply; call 3: only the gaps left. Detail: `${CLAUDE_SKILL_DIR}/references/clarify.md`.
4. **Look up** per practices.md: base image tag, feature majors, and each service's tag, port, data directory, env vars, and health command. Failure → call 3; call 3 already used → step 10, then stop.
5. **Draft.** Per practices.md: devcontainer.json, Compose files when needed, the `.gitattributes` LF rule, the firewall script, and the Dockerfile handoff arguments. Update mode keeps the existing config's intent and adds only what step 3 chose. Detail: `${CLAUDE_SKILL_DIR}/references/draft.md`.
6. **Plan.** Print each file's content (diff for existing files), the handoff arguments, and the change list. Nothing to add or fix in update mode → `Result: nothing-to-do`; skip to step 10, which runs on `Skipped practices:`/`Gaps:` items, else prints `Resolution: not run (nothing-to-do)`.
7. **Write** the step 5 files without asking (existing `.gitignore` and `.gitattributes` → append only missing lines). They come first, so the Dockerfile's `COPY` sources exist when it is reviewed.
8. **Dockerfile.** Dockerfile needed → invoke `cdk:write-dockerfile` via the Skill tool with the step 5 arguments, read its Output, and confirm `<App dir>/Dockerfile` matches the config's reference; a stop per orchestration.md ends through step 10. Detail: `${CLAUDE_SKILL_DIR}/references/dockerfile.md`.
9. **Verify.** Run the practices.md `## Checks` the host supports (analyzer `CLIs`). Each failure in a file this skill wrote → fix, print the diff, re-run (cap in Rules); a Dockerfile failure → report it, never fix it here. `devcontainer-up` only when the user asks.
10. **Resolve findings.** Per resolve-findings.md. Fix only files this skill wrote; a Dockerfile check failure is reported with the recommended `cdk:write-dockerfile` input, never fixed here (Rules).
11. **Report** the output below.

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
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```

`Next:` items: `cp .devcontainer/.env.example .devcontainer/.env` on fresh clones (Compose); commit `devcontainer-lock.json` after the first build; the trusted-repositories warning (Claude Code); firewall allowlist edits for the stack's registries (firewall).
