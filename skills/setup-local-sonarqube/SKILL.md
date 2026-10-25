---
name: setup-local-sonarqube
description: Writes compose.sonar.yaml with SonarQube Community Build and, for a supported stack, a Sonar Scanner service, plus VS Code tasks, then configures the server and writes its analysis token to .env.sonar. Use only when the user explicitly asks to set up local SonarQube.
compatibility: Claude Code only. Uses argument-hint, disable-model-invocation and CLAUDE_SKILL_DIR; claude.ai and API uploads reject unknown frontmatter keys.
argument-hint: '[--yes]'
allowed-tools: Bash(git rev-parse *) Bash(docker info *) Bash(docker compose -f compose.sonar.yaml config -q) Bash(docker compose -f compose.sonar.yaml ps -q sonarqube) Bash(docker compose -f compose.sonar.yaml up -d --wait --wait-timeout 300 sonarqube) Bash(docker compose -f compose.sonar.yaml stop sonarqube) Bash(node ${CLAUDE_SKILL_DIR}/scripts/sonar-setup.mjs *)
disable-model-invocation: true
---

# Setup Local SonarQube

Input: $ARGUMENTS

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

A Context value of `<none>` means that read failed. A missing value or `[shell command execution disabled by policy]` means run that command's `commands.md` row instead.

## Rules

- Rigor: never guess or invent: confirm each path, command, and fact by reading it; ask (unattended: record) what the input and repo cannot answer. Finish every step in full, think twice before each irreversible step, and re-check the result against these rules and the repo's standards before reporting.
- Efficiency: read only what a step needs, keep output terse, and take the fewest steps that meet the goal; spawn only the cdk subagent named in the Spawn rule below, never `Explore` or `general-purpose`; the spawn gets a complete brief (agent, literal inputs, scope, return block; missing or ambiguous → `Question:`, never assume).
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Setup only: write `compose.sonar.yaml`, `.vscode/tasks.json`, `.env.sonar`, and a `.gitignore` entry at the repo root; start `sonarqube` only to configure it and stop it afterwards unless it was already running; never scan, fix, or remove volumes.
- Exact tags: the images are pinned to the tags `compose` resolves (looked up at most once per day); never `latest`, never a host install.
- One scanner per stack: the scanner is the one the detected stack needs (`maven`, `gradle`, or `cli`); an unsupported or undetected stack gets a server-only file and a researched approach, never a guess.
- Secrets: they live only in `.env.sonar` (mode 600, gitignored), which the scanner service reads; `compose.sonar.yaml` and the tasks hold none. Never print, quote, or commit one.
- Never overwrite a file without the user's choice; `--yes` never overwrites. Never commit, push, or stash.
- Spawn only `cdk:topic-researcher` (unsupported stack); only this skill talks to the user.
- Unattended (`--yes`): ask nothing and report what is left in `Open:`.

## Workflow

1. **Pre-flight.** Root = Context → Repo root; `<none>` → stop (`not a git repo`). Detail: `${CLAUDE_SKILL_DIR}/references/flow.md` `## Pre-flight`.
2. **Write.** Run `compose` with `--root <root>`; an `ask` (two build tools) → AskUserQuestion, then re-run with `--stack <choice>`. Detail: `flow.md` `## Stack`.
3. **Exists.** `stop` = `compose.sonar.yaml exists` (nothing written) → attended: AskUserQuestion Overwrite | Stop; Overwrite → re-run `compose` with `--force`, Stop → `Result: cancelled`. Unattended: record it under `Open:` and stop. Detail: `flow.md` `## Exists`.
4. **Unsupported stack.** Any other `stop` except `invalid sonar.projectKey` → spawn `cdk:topic-researcher`; its answer and sources go under `Open:`. Detail: `flow.md` `## Unsupported stack`.
5. **Validate.** `docker-info` succeeds → run `compose-check`; else `Validate: skipped (no Docker)`. Detail: `flow.md` `## Validate`.
6. **Configure.** Docker available and validation passed → run `server-state`; empty → `server-up`; then `configure --root <root>`; run `server-stop` when this skill started the server, also when `configure` stops or throws. No Docker or a failed validation → `Env: skipped (<reason>)`. Detail: `flow.md` `## Configure`.
7. **Report.** Print the Output block; tell the user how to run it (`flow.md` `## Running it`).

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For pre-flight, stack handling, the exists ask, unsupported stacks, validation, and configuring the server, and running the result (steps 1–7), see `${CLAUDE_SKILL_DIR}/references/flow.md`.
- For the file contents, `${CLAUDE_SKILL_DIR}/scripts/sonar-setup.mjs` renders them through `compose` in `commands.md`; never read it.

## Output

```text
Stack: cli | maven | gradle | none (<reason>)
File: <root>/compose.sonar.yaml | not written
Tasks: .vscode/tasks.json (<labels>) | skipped (<reason>)
Services: sonarqube[, scanner]
Server: sonarqube:<tag>; scanner: <image>:<tag> | none
Validate: pass | fail (<reason>) | skipped (no Docker)
Env: <root>/.env.sonar (token <created|rotated>, <type>) | skipped (<reason>)
Server state: stopped | left running (was running)
Open: <researched approach and sources> | <configure stop and reset hint> | exclusion <pattern>: unsafe characters, dropped | none
Next: none
Result: done | stopped | cancelled
Stopped: <step>: <reason> | none
```

`done` = the file was written (a server-only file for an unsupported stack is still `done`, with the approach under `Open:`). `stopped` = pre-flight, an unresolved image tag, a refused unattended overwrite, or a failed validation ended the run. `cancelled` = the user chose Stop at step 3.
