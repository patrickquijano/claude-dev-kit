---
name: build-dockerfile
description: Writes, improves, or reviews a Dockerfile and .dockerignore per Docker best practices, verified by docker build --check. Use only when the user explicitly asks to write or review a Dockerfile.
argument-hint: '<app description | path | existing Dockerfile>'
allowed-tools: Bash(git rev-parse *) Bash(command -v *) Bash(docker build *) Bash(docker image inspect *) Bash(docker image rm *) WebFetch(domain:hub.docker.com)
---

# Write Dockerfile

Input: $ARGUMENTS

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `commands.md` row.

## Rules

- Rigor: never guess or invent: confirm each path, command, and fact by reading it; ask (unattended: record) what the input and repo cannot answer. Finish every step in full, think twice before each irreversible step, and re-check the result against these rules and the repo's standards before reporting.
- Efficiency: read only what a step needs, keep output terse, and take the fewest steps that meet the goal; when work is autonomous and splits cleanly, spawn independent cdk subagents in one parallel turn (`cdk:task-worker` for read-only work, `cdk:plan-implementer` for edits), never `Explore` or `general-purpose`; each spawn gets a complete brief (agent, kind, literal inputs, scope, return block; missing or ambiguous → `Question:`, never assume).
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Apply every **Required** item in `${CLAUDE_SKILL_DIR}/references/practices.md` and every other item that fits; a skipped item gets a reason in the Output. Input `target=devcontainer` → its `## Devcontainer target` replaces the items it names.
- Facts: runtime version, build and start commands, port, env vars, and system packages come from the input or the repo. Not derivable → ask (default target only).
- Never assume how to install a tool or package: research the vendor's official method and apply it (practices.md Install approach). Every `ARG` has a default value; no image digest anywhere.
- Never put secrets in `ARG`, `ENV`, `COPY`, or the image; use secret mounts.
- Multi-line `RUN` → heredoc starting `set -eux` (`set -eu` with a secret). Merge consecutive `RUN`s with the same cache inputs; never across a `COPY` or different inputs.
- Validate with `docker build --check`, lint with hadolint (`skipped (heredoc)` only on a parse error), test with `image-build` then `image-inspect` and `image-remove` (default target); never `docker build` without a throwaway tag.
- Writes and AskUserQuestion happen here only; `cdk:practices-reviewer` only reviews. Each write to an existing file prints its diff; no approval asked (local, reviewable files).
- AskUserQuestion or Write unavailable: ask the pending question as plain text with its options, end the turn, and take the next message as the answer.
- Caps: Clarify 3 AskUserQuestion calls; Verify-fix 3 attempts; tag listing 10 pages. Clarify cap or a failure before findings exist → `Result: stopped`. Verify cap or a later failure → list the leftovers in `Open:` and stop.
- Chained by `cdk:setup-devcontainer` (devcontainer target): unattended, ask nothing, report leftovers.

## Workflow

1. **Pre-flight.** Root = Context, else cwd; read input, app dir, target, and mode (review | update | create). Review with no Dockerfile → `nothing-to-do` (`flow.md` `## Pre-flight`).
2. **Analyze.** Collect stack, build and start facts, and existing Docker files. Review mode → step 6, then 7 (`flow.md` `## Analyze`).
3. **Clarify.** Ask only missing facts; apply the defaults without asking. Devcontainer → skip (`flow.md` `## Clarify`).
4. **Draft and plan.** Build `Dockerfile` and `.dockerignore` from practices.md; print them (a diff when existing) and the change list (`flow.md` `## Draft`).
5. **Write** `Dockerfile` in the app dir and `.dockerignore` at the context root (existing → append only missing entries).
6. **Verify.** Spawn `cdk:practices-reviewer` with `kind: dockerfile`, fix `error` and `warning` findings, up to the cap (`flow.md` `## Verify`).
7. **Report** leftovers under `Open:`, then print the Output.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For pre-flight, analyze, clarify defaults, draft order, the verify loop, and the spawn brief, see `${CLAUDE_SKILL_DIR}/references/flow.md`.
- For the Dockerfile rules (Required items, pins, cache, RUN, runtime, devcontainer target), see `${CLAUDE_SKILL_DIR}/references/practices.md`.

## Output

```text
Mode: create | update | review
App: <dir> (<language runtime version>, <package manager>)
Stages: <name: image:tag>, … (tool stages included)
App files: <copied: paths | not copied>
User: <APP_USER=… APP_UID=… APP_GID=… | root>
Files: Dockerfile (<written | updated | kept>), .dockerignore (<written | updated | kept>)
Changes: <change — reason>, … | none
Skipped practices: <item — reason> | none
Distro: <debian | ubuntu | alpine> (<reason when not Debian slim>)
Checks: docker build --check <pass | fail | not installed | error (<first line>)>, hadolint <pass | fail | skipped (heredoc) | not installed | error (<first line>)>, test build <pass | fail | skipped (no docker | review | devcontainer) | error (<first line>)>
Findings: <path:line practice id — fix>, … | none
Build: docker build -t <name> -f <Dockerfile> <context> (user command; the test image is removed)
Resolution: <n> resolved, <m> open (see Open) | none | not run
Open: <id: severity, reason; recommended fix>, … | none
Next: /cdk:commit-changes | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```

`Findings:` lists every reviewer finding in review mode, else only those left unfixed. Review mode prints `App`, `Stages`, `User` from the existing file and `Changes: none`. Devcontainer target prints `App: <dir> (devcontainer)`, `User: (from image)`, `Build: n/a (the devcontainer CLI builds it)`.
