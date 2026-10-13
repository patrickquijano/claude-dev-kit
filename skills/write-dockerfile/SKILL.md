---
name: write-dockerfile
description: Write, improve, or review a Dockerfile and .dockerignore for the repo's stack per Docker's official best practices (multi-stage, digest-pinned base images, cache and secret mounts, optional non-root user), verified by docker build --check (and hadolint when the file has no heredoc). Use only when the user explicitly asks to write, create, dockerize, optimize, or review a Dockerfile or container image build. Do not use on your own after finishing a task.
argument-hint: '<app description | path | existing Dockerfile>'
allowed-tools: Bash(git rev-parse *) Bash(command -v *) Bash(docker buildx imagetools inspect *) WebFetch(domain:hub.docker.com)
---

# Write Dockerfile

Input: $ARGUMENTS

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

A Context value of `<none>` means that read failed. A missing value or `[shell command execution disabled by policy]` means run that command's `commands.md` row instead.

## Rules

- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- User interaction (AskUserQuestion) and writes only here; `cdk:dockerfile-reviewer` only reviews.
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/../shared/references/fallbacks.md`.
- No invented facts: runtime version, build and start commands, port, env vars, and system packages come from the input or the repo (manifests, lockfiles, version files, scripts, CI, existing Docker files). Not derivable → ask (default target only).
- Apply every **Required** item in `${CLAUDE_SKILL_DIR}/references/practices.md`, and every other item that fits; each item says why. Skipped item → reason in the Output. Required items: multi-stage; distribution order Debian, Ubuntu, Alpine (first the runtime's official image supports, slim when compatible); base images at an exact tag (never `latest`, `lts`, or a bare major) plus digest, resolved at run time per practices.md, via `<NAME>_IMAGE`, `<NAME>_TAG`, `<NAME>_DIGEST` ARGs; tools from official or trusted images via a digest-pinned stage and `COPY --link --from` instead of installs; no versions in system or application package installs (freshness comes from unversioned system and package-manager upgrades); caches, indexes, build dependencies, and temp files removed in the same layer (cache-mounted paths exempt). Input `target=devcontainer` → practices `## Devcontainer target` replaces the items it names.
- Multi-line `RUN` → heredoc (`RUN <<EOF` … `EOF`) starting with `set -eux` (`set -eu` when it uses a secret, so `-x` never prints it), so a failing line stops the build. Consecutive `RUN` instructions in a stage with the same cache inputs → merge into one, so the image has fewer layers. Never merge across a `COPY` or across different inputs (system packages vs lockfile vs source); that would rerun installs on every source edit.
- Checks: `docker build --check` is the primary check. hadolint runs only on a heredoc-free Dockerfile, since it cannot parse heredocs, so under the heredoc rule it usually reports `skipped (heredoc)`.
- Never put secrets in `ARG`, `ENV`, `COPY`, or the image; use secret mounts.
- Every write to an existing file (step 6 and step 7 fixes) prints its diff; no approval asked, since the files are local and the diff is reviewable.
- Loops: clarify (step 3) max 3 AskUserQuestion calls, then Stopped with the facts still missing; verify-fix (step 7) max 3 attempts, still failing → Stopped.
- Step 3 cap hit, or a failure before findings exist → print the Output, `Result: stopped`, `Stopped: <step>: <reason>`, and end. Step 7 cap hit, or a failure after findings exist → run step 8 (**Resolve findings.**) on what is left, without re-entering the loop, then print the Output with `Result: stopped`, `Stopped: <step>: <reason>`, and end.
- Chained by `cdk:setup-devcontainer` via the Skill tool; never set `disable-model-invocation: true` (it blocks that invocation).
- Final step: follow `${CLAUDE_SKILL_DIR}/../shared/references/resolve-findings.md` (scope: edit; sources: unfixed `Findings:`, `Skipped practices:`, `Checks:` fail or not installed).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../shared/references/known-issues.md` with slug `write-dockerfile` and store `${CLAUDE_PLUGIN_DATA}/known-issues`.

## Workflow

1. **Pre-flight.** Root = Context → Repo root, else cwd. Read the input; app dir = `dir=`, else root; target and mode (review | update | create) from the input. Review mode, no Dockerfile → `Result: nothing-to-do`. Detail: `${CLAUDE_SKILL_DIR}/references/preflight.md`.
2. **Analyze.** Collect the stack, build and start facts, and existing Docker files; devcontainer target collects less. Review mode → step 7, then steps 8 and 9. Detail: `${CLAUDE_SKILL_DIR}/references/analyze.md`.
3. **Clarify.** Devcontainer target → skip. Ask only missing facts (max 4 per call); apply the Recommended defaults without asking. Detail: `${CLAUDE_SKILL_DIR}/references/clarify.md`.
4. **Draft.** Build the `Dockerfile` and `.dockerignore` from practices.md; update mode keeps its intent and lists each change with its reason. Detail: `${CLAUDE_SKILL_DIR}/references/draft.md`.
5. **Plan.** Print the Dockerfile, `.dockerignore`, and the change list (diff for existing files), then write without asking.
6. **Write** `Dockerfile` in the app dir and `.dockerignore` at the build context root (existing `.dockerignore` → append only missing entries).
7. **Verify.** Spawn `cdk:dockerfile-reviewer` with: Dockerfile path(s), `.dockerignore` path (or none), practices path `${CLAUDE_SKILL_DIR}/references/practices.md`, build context dir, target (default | devcontainer). Use its `Findings`, `Checks`, `Tool output`.
   - Review mode → report its findings; write nothing.
   - Create or update → each `error` or `warning` finding → fix, print the diff, write the fixes without asking; re-run this step (cap in Rules). `info` findings → list only.
   - Full `docker build` only when the user asks (it downloads images and runs build commands).
8. **Resolve findings.** Per resolve-findings.md. Edit only the `Dockerfile` and `.dockerignore` this run wrote or updated; review mode writes nothing, so its items are reported with their recommended fix. Itemize the unfixed `Findings:`; `Checks:` fail, `error (…)`, or not installed (a tool `error` is reported with no fix loop; a skipped hadolint for a heredoc is not an item). Devcontainer target chained by `cdk:setup-devcontainer` is unattended: ask nothing.
9. **Report** the output below.

## Output

```text
Mode: create | update | review
App: <dir> (<language runtime version>, <package manager>)
Stages: <name: image:tag@digest>, … (tool stages included)
App files: <copied: paths | not copied>
User: <APP_USER=… APP_UID=… APP_GID=… | root>
Files: Dockerfile (<written | updated | kept>), .dockerignore (<written | updated | kept>)
Changes: <change — reason>, … | none
Skipped practices: <item — reason> | none
Distro: <debian | ubuntu | alpine> (<reason when not Debian slim>)
Checks: docker build --check <pass | fail | not installed | error (<first line>)>, hadolint <pass | fail | skipped (heredoc) | not installed | error (<first line>)>
Findings: <path:line practice id — fix>, … | none
Build: docker build -t <name> -f <Dockerfile> <context>
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```

`Findings:` lists every reviewer finding in review mode; in create or update mode, only the findings left unfixed. Review mode prints `App`, `Stages`, `User` from the existing file and leaves `Changes` at none. Devcontainer target prints `App: <dir> (devcontainer)`, `User: (from image)`, and `Build: n/a (the devcontainer CLI builds it)`.
