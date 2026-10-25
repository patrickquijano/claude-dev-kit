---
name: build-dockerfile
description: Writes, improves, or reviews a Dockerfile and .dockerignore per Docker best practices, verified by docker build --check. Use only when the user explicitly asks to write or review a Dockerfile.
compatibility: Claude Code only. Uses argument-hint, disable-model-invocation and CLAUDE_SKILL_DIR; claude.ai and API uploads reject unknown frontmatter keys.
argument-hint: '<app description | path | existing Dockerfile>'
allowed-tools: Bash(git rev-parse *) Bash(command -v docker) Bash(command -v hadolint) Bash(docker build --check -f * *) Bash(hadolint *) Bash(node ${CLAUDE_SKILL_DIR}/scripts/resolve-tag.mjs *) Bash(docker image inspect cdk-build-test:* --format *)
disable-model-invocation: true
---

# Build Dockerfile

Input: $ARGUMENTS

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `commands.md` row.

## Rules

- Ask (unattended: record) what the input and repo cannot answer.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Apply every **Required** item in `${CLAUDE_SKILL_DIR}/references/practices.md` and every other item that fits; a skipped item gets a reason in the Output. Input `target=devcontainer` → its `## Devcontainer target` replaces the items it names.
- Facts: runtime version, build and start commands, port, env vars, and system packages come from the input or the repo. Not derivable → ask (default target only).
- Never assume how to install a tool or package: research the vendor's official method and apply it (practices.md Install approach). Every `ARG` has a default value; no image digest anywhere.
- Never put secrets in `ARG`, `ENV`, `COPY`, or the image; use secret mounts.
- Multi-line `RUN` → heredoc starting `set -eux` (`set -eu` with a secret). Merge consecutive `RUN`s with the same cache inputs; never across a `COPY` or different inputs.
- Validate with `build-check` and lint with `hadolint-lint` (`skipped (heredoc)` only on a parse error): the reviewer subagent runs them, and step 6 runs them inline when it is unavailable. This skill itself runs the test (`image-build`, then `image-inspect` and `image-remove`; default target) after the `ExitPlanMode` approval; never `docker build` without `--check` or a throwaway tag.
- Writes and AskUserQuestion happen here only; the reviewer subagent only reads. Each write to an existing file prints its diff. The write and the test build need the `ExitPlanMode` approval, whose plan names the files, the test build (it pulls images and runs the Dockerfile's `RUN` commands), and any `tool-probe` (`flow.md` `## Plan mode`); plan mode declined or unavailable → `Result: stopped`, `Stopped: 5: plan mode declined`. Unattended: write the files, skip the test build (`skipped (unattended)`), and list it under `Open:`.
- AskUserQuestion or Write unavailable: ask the pending question as plain text with its options, end the turn, and take the next message as the answer.
- Caps: Clarify 3 AskUserQuestion calls; plan rejections 3 (`flow.md` `## Plan mode`); Verify-fix 3 attempts. Clarify cap or a failure before findings exist → `Result: stopped`. Verify cap or a later failure → list the leftovers in `Open:`, `Result: stopped`, `Stopped: <step>: verify cap` (or the failure), and stop.

## Workflow

1. **Pre-flight.** Root = Context, else cwd; read input, app dir, target, and mode (review | update | create). Review with no Dockerfile → `nothing-to-do` (`flow.md` `## Pre-flight`). Then enter plan mode per `flow.md` `## Plan mode`.
2. **Analyze.** Collect stack, build and start facts, and existing Docker files. Review mode → step 6, then 7 (`flow.md` `## Analyze`).
3. **Clarify.** Ask only missing facts; apply the defaults without asking. Devcontainer → skip (`flow.md` `## Clarify`).
4. **Draft and plan.** Resolve image tags with `resolve-tag` only for an image without an exact tag; build `Dockerfile` and `.dockerignore` from practices.md; print them (a diff when existing) and the change list (`flow.md` `## Draft`).
5. **Write**, once the plan is approved (unattended: right after the print), `Dockerfile` in the app dir and `.dockerignore` at the context root (existing → append only missing entries).
6. **Verify.** Spawn a read-only reviewer subagent (brief in `flow.md` `## Spawn briefs`), fix `error` and `warning` findings, up to the cap (`flow.md` `## Verify`).
7. **Report** leftovers under `Open:`, then print the Output.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For pre-flight, plan mode, analyze, clarify defaults, draft order, the verify loop, and the spawn brief, see `${CLAUDE_SKILL_DIR}/references/flow.md`.
- For the Dockerfile rules (Required items, pins, cache, RUN, runtime, devcontainer target), see `${CLAUDE_SKILL_DIR}/references/practices.md`.
- To resolve a Docker Hub base-image tag (step 4; run, never read), see `${CLAUDE_SKILL_DIR}/scripts/resolve-tag.mjs`.
- For test cases, see `${CLAUDE_SKILL_DIR}/references/evals.md`.

## Output

```text
Mode: create | update | review
Plan mode: entered | already active | declined | skipped (<reason>)
Purpose: production | dev | devcontainer
App: <dir> (<language runtime version>, <package manager>)
Stages: <name: image:tag>, … (tool stages included)
App files: <copied: paths | not copied>
User: <APP_USER=… APP_UID=… APP_GID=… | root>
Files: Dockerfile (<written | updated | kept>), .dockerignore (<written | updated | kept>)
Changes: <change — reason>, … | none
Skipped practices: <item — reason> | none
Distro: <debian | ubuntu | alpine> (<reason when not Debian slim>)
Checks: docker build --check <pass | fail | not installed | error (<first line>)>, hadolint <pass | fail | skipped (heredoc) | not installed | error (<first line>)>, test build <pass | fail | skipped (no docker | review | devcontainer | unattended) | error (<first line>)>
Findings: <path:line practice id — fix>, … | none
Build: docker build --sbom=true --provenance=mode=max -t <name> -f <Dockerfile> <context> (user command; the test image is removed)
Resolution: <n> resolved, <m> open (see Open) | none | not run
Open: <id: severity, reason; recommended fix>, … | none
Next: commit the changes | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```

`Findings:` lists every reviewer finding in review mode, else only those left unfixed. Review mode prints `App`, `Stages`, `User` from the existing file and `Changes: none`. Devcontainer target prints `App: <dir> (devcontainer)`, `User: (from image)`, `Build: n/a (the devcontainer CLI builds it)`.
