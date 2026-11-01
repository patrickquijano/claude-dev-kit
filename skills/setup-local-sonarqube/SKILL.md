---
name: setup-local-sonarqube
description: Writes compose.sonar.yaml (SonarQube Community Build and a stack scanner), VS Code tasks, and an analysis token in .env.sonar. Use only when the user explicitly asks to set up local SonarQube.
compatibility: Claude Code only. Uses argument-hint, disable-model-invocation and CLAUDE_SKILL_DIR; claude.ai and API uploads reject unknown frontmatter keys.
argument-hint: '[--yes]'
allowed-tools: Bash(git rev-parse *) Bash(docker info *) Bash(docker compose -f compose.sonar.yaml config -q) Bash(docker compose -f compose.sonar.yaml ps -q sonarqube) Bash(docker compose -f compose.sonar.yaml up -d --wait --wait-timeout 300 sonarqube) Bash(docker compose -f compose.sonar.yaml stop sonarqube) Bash(node ${CLAUDE_SKILL_DIR}/scripts/sonar-setup.mjs *) WebFetch(domain:docs.sonarsource.com) WebFetch(domain:docs.docker.com)
disable-model-invocation: true
---

# Setup Local SonarQube

Input: $ARGUMENTS (strip `--yes` first)

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

A Context value of `<none>` means that read failed. A missing value or `[shell command execution disabled by policy]` means run that command's `commands.md` row instead.

## Rules

- Ask (unattended: record) what the input and repo cannot answer.
- Spawn only the `cdk:topic-researcher` subagent (fallback: a read-only research subagent), with a complete brief (task, literal inputs, scope, return block; missing or ambiguous → `Question:`, never assume).
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Setup only: write `compose.sonar.yaml`, `.vscode/tasks.json`, `.env.sonar`, and a `.gitignore` entry at the repo root; start `sonarqube` only to configure it and stop it afterwards unless it was already running; never scan, fix, or remove volumes.
- Exact tags: the images are pinned to the tags `compose` resolves (looked up at most once per day); never `latest`, never a host install.
- One scanner per stack: the scanner is the one the detected stack needs (`maven`, `gradle`, or `cli`); an unsupported or undetected stack gets a server-only file and a researched approach, never a guess.
- Secrets: they live only in `.env.sonar` (mode 600, gitignored), which the scanner service reads; `compose.sonar.yaml` and the tasks hold none. Never print, quote, or commit one.
- Before the first write, print the plan naming every effect (the files, starting the server, rotating the analysis token), then continue with no wait. Never overwrite a file this skill did not create, never rotate a token in a `.env.sonar` it did not write (its first line is `# Written by setup-local-sonarqube`), and never pass `--force`; list such files under `Open:`. Never commit, push, or stash.
- Only this skill talks to the user.
- Flags: `--yes` runs unattended: no questions, recommended options taken, assumptions under `Open:`. Only a flag the user passed counts; never add one.

## Workflow

1. **Pre-flight.** Root = Context → Repo root; `<none>` → stop (`not a git repo`). Then print the plan per `${CLAUDE_SKILL_DIR}/references/flow.md` `## Plan`; it names every effect (list in `flow.md` `## Pre-flight`). Detail: `${CLAUDE_SKILL_DIR}/references/flow.md` `## Pre-flight`.
2. **Write.** Run `compose` with `--root <root>`; an `ask` (two build tools) → AskUserQuestion, then re-run with `--stack <choice>`. Detail: `flow.md` `## Stack`.
3. **Exists.** `stop` = `compose.sonar.yaml exists` (nothing written) → the file has no skill marker, so it is not treated as skill-created: stop with `Result: stopped`, list the file under `Open:` (rename or remove it to re-run). Detail: `flow.md` `## Exists`.
4. **Unsupported stack.** Any other `stop` except `invalid sonar.projectKey` → spawn the `cdk:topic-researcher` subagent (fallback: a research subagent; inline research when it is unavailable); its answer and sources go under `Open:`. Detail: `flow.md` `## Unsupported stack`.
5. **Validate.** `docker-info` succeeds → run `compose-check`; else `Validate: skipped (no Docker)`. Detail: `flow.md` `## Validate`.
6. **Configure.** `.env.sonar` exists without the first-line marker → `Env: skipped (.env.sonar not created by this skill)`, list it under `Open:`. Else, Docker available and validation passed → run `server-state`; empty → `server-up`; then `configure --root <root>`; run `server-stop` when this skill started the server, also when `configure` stops or throws. No Docker or a failed validation → `Env: skipped (<reason>)`. Detail: `flow.md` `## Configure`.
7. **Report.** Print the Output block; tell the user how to run it (`flow.md` `## Running it`).

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For pre-flight, the plan, stack handling, the existing-file stop, unsupported stacks, validation, and configuring the server, and running the result (steps 1–7), see `${CLAUDE_SKILL_DIR}/references/flow.md`.
- For the file contents, `${CLAUDE_SKILL_DIR}/scripts/sonar-setup.mjs` renders them through `compose` in `commands.md`; it is run, never read.
- For test cases, see `${CLAUDE_SKILL_DIR}/references/evals.md`.

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
Result: done | stopped
Stopped: <step>: <reason> | none
```

`done` = the file was written (a server-only file for an unsupported stack is still `done`, with the approach under `Open:`). `stopped` = pre-flight, an existing `compose.sonar.yaml`, an unresolved image tag, or a failed validation ended the run.
