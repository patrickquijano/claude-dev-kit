---
name: build-docker-compose
description: Writes, improves, or reviews a Docker Compose file for plain Compose or a Swarm stack, with exact image tags, validated and linted. Use only when the user explicitly asks to write or review Compose.
argument-hint: '<app description | path | existing compose file>'
allowed-tools: Bash(git rev-parse *) Bash(command -v *) Bash(docker info *) WebFetch(domain:hub.docker.com)
---

# Write Docker Compose

Input: $ARGUMENTS

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `commands.md` row.

## Rules

- Rigor: never assume, guess, or invent a service, port, volume, name, value, path, command, or fact: confirm each by reading it; ask (unattended: record) what the input and repo cannot answer. Finish every step in full, think twice before each irreversible step, and re-check the result against these rules and the repo's standards before reporting.
- Efficiency: read only what a step needs, keep output terse, and take the fewest steps that meet the goal; when work is autonomous and splits cleanly, spawn independent cdk subagents in one parallel turn (`cdk:task-worker` for read-only work, `cdk:plan-implementer` for edits), never `Explore` or `general-purpose`.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Sources: every key and value written comes from the input, an existing compose file, a user answer, or a **Required** item in `${CLAUDE_SKILL_DIR}/references/practices.md`; nothing else.
- Scope: read only the input, the paths it names, and compose files at the root (`flow.md` `## Pre-flight`); never scan or read other paths (source, CI, scripts, Dockerfiles, `.env*`) unless the input names them. Edit only the compose file.
- Output form: long (mapping) syntax for every entry that has one, and no key set to its documented default (`practices.md` `## Long syntax`, `## Defaults`).
- Apply every **Required** item for the chosen mode in `practices.md`; apply a **Recommended** item only when the input or a user answer asks for it. A skipped Required item gets a reason in the Output.
- Mode: plain Compose or Swarm stack, decided from the input and compose-file signals, else asked (`flow.md` `## Mode`). `deploy:` alone never proves Swarm.
- Ask every configuration choice (mode, scoped file name, services, ports, volumes, secrets, configs, resource limits, restart and update policy) with AskUserQuestion: recommended option first, one-line reason, max 4 questions per call. Stated in the input or the existing compose file → do not ask.
- Files: base `compose.yaml`; a scoped or environment file `compose.<scope>.yaml`, the name asked. Never create `docker-compose.yml` or any `.yml` file.
- Images: every image pinned to its most specific tag from a Docker Hub lookup; never `latest`, a floating tag, or a guess. Other registry or failed lookup → ask the user.
- Never write secret values into the file; reference secrets, `env_file`, or `${VAR:?err}`.
- Validate and lint after writing; never start containers (no `docker compose up`, `run`, or `stack deploy`). Never print or log `config` output: it can hold resolved secrets.
- Writes and AskUserQuestion happen here only. Each write to an existing file prints its diff; no approval asked (local, reviewable files).
- AskUserQuestion or Write unavailable: ask the pending question as plain text with its options, end the turn, and take the next message as the answer.
- Caps: Clarify 3 AskUserQuestion calls; Verify-fix 3 attempts; tag listing 10 pages. Clarify cap or a failure before a draft exists → `Result: stopped`. Verify cap or a later failure → list the leftovers in `Open:` and stop.
- Unattended (chained or no way to ask): ask nothing, list each unanswered choice under `Open:`.

## Workflow

1. **Pre-flight.** Root = Context, else cwd; read the input and find existing compose files; mode: review | update | create (`flow.md` `## Pre-flight`).
2. **Analyze.** Collect services, images, ports, env var names, volumes, and Swarm signals from the input and compose files only (`flow.md` `## Analyze`). Review mode → step 7, then 8.
3. **Mode.** Pick plain Compose or Swarm stack from the signals, else ask (`flow.md` `## Mode`).
4. **Clarify.** Ask only unresolved choices, recommended first with the reason (`flow.md` `## Clarify`).
5. **Draft and plan.** Resolve every image tag per practices.md; build the file; print it (a diff when existing) with the change list (`flow.md` `## Draft`).
6. **Write** the file (`flow.md` `## Write`).
7. **Verify.** Validate and lint with the commands for the mode; fix up to the cap (`flow.md` `## Verify`).
8. **Review and report.** Check the file against every Required item, list leftovers under `Open:`, print the Output.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For pre-flight, mode detection, clarify questions, draft order, write naming, and the verify loop, see `${CLAUDE_SKILL_DIR}/references/flow.md`.
- For the Required and Recommended rules per mode, the image tag lookup, and the open gaps, see `${CLAUDE_SKILL_DIR}/references/practices.md`.

## Output

```text
Mode: create | update | review; plain Compose | Swarm stack (<signal or answer>)
File: <path> (<written | updated | kept>)
Services: <name: image:tag>, … | none
Choices: <question: answer>, … | none
Changes: <change — reason>, … | none
Skipped practices: <item — reason> | none
Checks: config <pass | fail | skipped (<reason>)>, dclint <pass | fail | skipped (<reason>)>
Findings: <path:line item — fix>, … | none
Open: <item: reason; recommended fix>, … | none
Next: /cdk:commit-changes | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```

`Findings:` lists every finding in review mode, else only those left unfixed. The run starts no containers; deploy with `docker compose up -d` or `docker stack deploy -c <file> <stack>` yourself.
