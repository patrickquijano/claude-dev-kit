---
name: build-docker-compose
description: Writes, improves, or reviews a Docker Compose file for Compose / DevContainer or Compose Deploy, with exact image tags, validated and linted. Use when asked to write or review Compose.
compatibility: Claude Code only. Uses argument-hint and CLAUDE_SKILL_DIR; claude.ai and API uploads reject unknown frontmatter keys.
argument-hint: '[--yes] [--no-plan] <app description | path | existing compose file>'
allowed-tools: Bash(git rev-parse *) Bash(command -v docker) Bash(docker info --format *) Bash(node --version) Bash(npm view dclint version) Bash(npm view dclint@* engines --json) Bash(git mv docker-compose.yml compose.yaml) Bash(git mv docker-compose.yaml compose.yaml)
---

# Build Docker Compose

Input: $ARGUMENTS (strip `--yes` and `--no-plan` first)

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `commands.md` row.

## Rules

- Ask (unattended: record) what the input and repo cannot answer.
- Flags: `--yes` = unattended: no plan mode, no questions, recommended options taken, assumptions under `Open:` (the unattended rules below apply); `--no-plan` skips plan mode only and every gate and question is still asked. Only a flag the user passed counts; never add one. `--yes` never covers a destructive step (admin-bypass merge, force-push, branch delete, `git reset --hard`, overwriting a dirty or unnamed file): it is still asked, and when nobody can answer it is skipped and listed under `Open:`.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Sources: every key and value written comes from the input, an existing compose file, a user answer, or a **Required** item in `${CLAUDE_SKILL_DIR}/references/practices.md`; nothing else.
- Scope: read only the input, the paths it names, and compose files at the root (`flow.md` `## Pre-flight`); never scan or read other paths (source, CI, scripts, `.env*`) unless the input names them; the one exception is a Glob on `**/Dockerfile*` and `**/*.Dockerfile` for file names only, never their contents. Edit only the compose file (and the plan file in plan mode); the one allowed rename is `compose-rename`, after the user confirms it.
- Output form: long (mapping) syntax for every entry that has one, and no key set to its documented default (`practices.md` `## Long syntax`, `## Defaults`).
- Apply every **Required** item for the chosen mode in `practices.md`; apply a **Recommended** item only when the input or a user answer asks for it. A skipped Required item gets a reason in the Output.
- Target: **Compose / DevContainer** (plain Compose) or **Compose Deploy** (Swarm stack, Deploy spec); asked unless the input or an existing compose file states it, with signals only setting the Recommended option (`flow.md` `## Target`). `deploy:` alone never proves Swarm.
- App: **Backend API** or **Frontend UI**, asked unless the input states it (`flow.md` `## App`). Both app types get the Dockerfile question; only a backend gets the backing-service questions (`references/services.md`); only Compose Deploy gets the per-service deploy questions (`flow.md` `## Clarify`).
- Every configuration choice (target, app type, Dockerfile, backing services, scoped file name, services, ports, volumes, secrets, configs, and per-service deploy settings) is a decision question; max 4 per call, the Recommended option first in the call. Grill (decision questions only; gates keep their form): mine the conversation, files, and repo first, ask only what changes the output, and never fill a gap with an assumption. Use the structured-question tool (discover its name and limits at runtime; inside a delegated subagent ask in the main thread before delegating; unavailable → a numbered inline list, then stop for the answer). A fact-dependent question gets one web search per topic, official docs preferred, URLs cited; no search tool or source → "unverified", never an invented fact, source, or number. Before each question show the score table, the recommendation, and the option descriptions with cited sources per `${CLAUDE_SKILL_DIR}/references/grill.md`; this holds for every question in `flow.md` `## Target`, `## App`, and `## Clarify`. Stated in the input or the existing compose file → do not ask.
- Files: base `compose.yaml`; a scoped or environment file `compose.<scope>.yaml`, the name asked, validated together with `compose.yaml`. Never create `docker-compose.yml` or any `.yml` file.
- Images: every image pinned to its most specific tag from a Docker Hub lookup; never `latest`, a floating tag, or a guess. Other registry (for example `mcr.microsoft.com`) or failed lookup → ask the user.
- Never write secret values into the file; reference secrets, `env_file`, or `${VAR:?err}`.
- Validate and lint after writing; never start containers (no `docker compose up`, `run`, or `stack deploy`). Never print or log `config` output: it can hold resolved secrets.
- Writes and AskUserQuestion happen here only. Before the Write, print the file (a diff when existing); the `ExitPlanMode` approval (first write only; each fix round re-enters plan mode, `flow.md` `## Verify`) names each effect: "Create <file>" or "Update <file> in place", then "run dclint via npx (downloads the pinned package)", and the `compose-rename` `git mv` when chosen (`flow.md` `## Plan mode`). Plan mode declined or unavailable → `Result: stopped`, `Stopped: 6: plan mode declined`; `--no-plan`, `--yes`, or unattended → no plan mode, write and report. Review mode writes nothing, so it asks only the dclint effect before the lint (`flow.md` `## Verify`); that ask is outside the question groups.
- AskUserQuestion or Write unavailable: ask the pending question as plain text with its options, end the turn, and take the next message as the answer.
- Caps: at most 4 questions per AskUserQuestion call; a group may span several calls; each question asked once; plan rejections 3, then `Result: cancelled`; Verify-fix 3 attempts. A failure before a draft exists → `Result: stopped`. Verify cap or a later failure → list the leftovers in `Open:`, `Result: stopped`, `Stopped: <step>: verify cap` (or the failure), and stop.
- Unattended (`--yes`, or no way to ask): ask nothing; `--yes` takes each Recommended answer and lists it under `Open:`; with no Recommended option (close call, no signal) the choice stays unset and is listed under `Open:`.

## Workflow

1. **Pre-flight.** Root = Context, else cwd; read the input and find existing compose files; mode: review | update | create (`flow.md` `## Pre-flight`). Then enter plan mode per `flow.md` `## Plan mode`.
2. **Analyze.** Collect services, images, ports, env var names, volumes, and Swarm signals from the input and compose files only (`flow.md` `## Analyze`). Review mode → step 3 without asking, then 7, then 8.
3. **Target and app.** Ask Compose / DevContainer or Compose Deploy, then Backend API or Frontend UI, unless stated (`flow.md` `## Target`, `## App`).
4. **Clarify.** Ask the Dockerfile, backend-service, scoped-file, common, and per-service deploy questions in that order, recommended first with the reason (`flow.md` `## Clarify`).
5. **Draft and plan.** Resolve image tags with a read-only subagent that resolves image tags (fallback: `cdk:version-resolver`; brief in `flow.md` `## Spawn briefs`); build the file; print it (a diff when existing) with the change list (`flow.md` `## Draft`).
6. **Write** the file after the `ExitPlanMode` approval (`flow.md` `## Write`).
7. **Verify.** Validate and lint with the commands for the mode; fix up to the cap (`flow.md` `## Verify`).
8. **Review and report.** Check the file against every Required item, list leftovers under `Open:`, print the Output.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For pre-flight, plan mode, target and app questions, clarify questions, draft order, write naming, and the verify loop, see `${CLAUDE_SKILL_DIR}/references/flow.md`.
- For the Required and Recommended rules per mode, the image tag lookup, and the open gaps, see `${CLAUDE_SKILL_DIR}/references/practices.md`.
- For the backing-service candidate pools with official images and docs URLs, see `${CLAUDE_SKILL_DIR}/references/services.md`.
- For test cases, see `${CLAUDE_SKILL_DIR}/references/evals.md`.
- For the grill table, anchors, and sensitivity rule, read `${CLAUDE_SKILL_DIR}/references/grill.md` when a Clarify step asks a decision question.

## Output

```text
Mode: create | update | review
Target: Compose / DevContainer | Compose Deploy (<signal or answer>) | unset (<reason>)
App: Backend API | Frontend UI (<signal or answer>) | unset (<reason>)
Plan mode: entered | already active | declined | skipped (--no-plan | --yes | <reason>)
File: <path> (<written | updated | kept>)
Services: <name: image:tag>, … | none
Choices: <question: answer>, … | none
Changes: <change — reason>, … | none
Skipped practices: <item — reason> | none
Checks: config <pass | fail | skipped (<reason>)>, dclint <pass | fail | skipped (<reason>)>
Findings: <path:line item — fix>, … | none
Open: <item: reason; recommended fix>, … | none
Next: write a Dockerfile with the build-dockerfile skill | commit the changes | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```

`Findings:` lists every finding in review mode, else only those left unfixed. The run starts no containers; deploy with `docker compose up -d` or `docker stack deploy -c <file> <stack>` yourself.
