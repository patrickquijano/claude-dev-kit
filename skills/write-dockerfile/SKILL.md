---
name: write-dockerfile
description: Write, improve, or review a Dockerfile and .dockerignore for the repo's stack per Docker's official best practices (multi-stage, digest-pinned base images, cache and secret mounts, optional non-root user), verified by docker build --check and hadolint. Use only when the user explicitly asks to write, create, dockerize, optimize, or review a Dockerfile or container image build. Do not use on your own after finishing a task.
argument-hint: '<app description | path | existing Dockerfile>'
allowed-tools: Bash(git rev-parse *) Bash(command -v *) Bash(docker buildx imagetools inspect *) WebFetch(domain:hub.docker.com)
---

# Write Dockerfile

Input: $ARGUMENTS

## Rules

- User interaction (AskUserQuestion) and writes only here; `cdk:dockerfile-reviewer` only reviews.
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/fallbacks.md`.
- No invented facts: runtime version, build and start commands, port, env vars, and system packages come from the input or the repo (manifests, lockfiles, version files, scripts, CI, existing Docker files). Not derivable → ask.
- Apply every **Required** item in `${CLAUDE_SKILL_DIR}/practices.md`, and every other item that fits; each item says why. Skipped item → reason in the Output. Required items: multi-stage; base images at an exact tag plus digest, via `<NAME>_IMAGE`, `<NAME>_TAG`, `<NAME>_DIGEST` ARGs; no versions in system or application package installs.
- Multi-line `RUN` → heredoc (`RUN <<EOF` … `EOF`) starting with `set -eux` (`set -eu` when it uses a secret, so `-x` never prints it), so a failing line stops the build. Consecutive `RUN` instructions in a stage with the same cache inputs → merge into one, so the image has fewer layers. Never merge across a `COPY` or across different inputs (system packages vs lockfile vs source); that would rerun installs on every source edit.
- Checks: `docker build --check` is the primary check. hadolint runs only on a heredoc-free Dockerfile, since it cannot parse heredocs, so under the heredoc rule it usually reports `skipped (heredoc)`.
- Never put secrets in `ARG`, `ENV`, `COPY`, or the image; use secret mounts.
- Every write to an existing file (step 6 and step 7 fixes) prints its diff; no approval asked, since the files are local and the diff is reviewable.
- Loops: clarify (step 3) max 3 AskUserQuestion calls, then Stopped with the facts still missing; verify-fix (step 7) max 3 attempts, still failing → Stopped.
- Step 3 cap hit, step 7 cap hit, or any failure → print the Output, `Result: stopped`, `Stopped: <step>: <reason>`, and end.
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `write-dockerfile`.

## Workflow

1. **Pre-flight.** Root = `git rev-parse --show-toplevel`, else cwd. Read the input (text, paths, pasted Dockerfile); app dir = the dir it points to, else root. Mode: input asks only to review, score, or audit → review (writes nothing); Dockerfile exists in the app dir → update; else create. Review mode, no Dockerfile → tell user; AskUserQuestion: Switch to create mode | Stop. Stop → end, `Result: nothing-to-do`.
2. **Analyze.** Collect: language and runtime version (`.nvmrc`, `engines`, `.python-version`, `go` directive, `rust-toolchain`, `global.json`, …), package manager + lockfile, build command and output dir, start command, port, env vars, system packages, health endpoint, monorepo layout. Existing `Dockerfile`, `.dockerignore`, `compose*.yaml`, CI build steps → read them. Build context = the dir the build needs files from (monorepo app using shared packages → repo root); `.dockerignore` goes at the context root. Review mode → step 7, then step 8.
3. **Clarify.** Each fact still missing or ambiguous → AskUserQuestion (max 4 per call), recommended option first with the reason: base image family (slim Debian (Recommended; glibc, broad package support) | Alpine | distroless), exact runtime version, build and start commands, port, target (production vs dev image). Derivable → don't ask. Always ask, unless the input or an existing Dockerfile already answers:
   - Copy application files into the image? Yes, only needed files (Recommended; self-contained image) | No (app mounted or supplied at run time).
   - Create a non-root user and group? Yes (Recommended; limits damage if the app is compromised) | No, run as root. Yes → ask the defaults for `APP_USER` (same name for user and group), `APP_UID`, `APP_GID`: `app`, `10001`, `10001` (Recommended; above the range distros assign to system and login accounts) | other values the user gives.
4. **Draft.** Build the `Dockerfile` from practices.md: syntax line, image `ARG`s with tag and digest (look up each digest per practices.md; never guess), build stages, runtime stage, cache mounts for the detected package manager, unversioned package installs, explicit `COPY` of needed paths only (when chosen), user and group from `ARG`s (when chosen), heredoc multi-line `RUN`s, merged `RUN`s, `.dockerignore` entries for the stack. Update mode → keep its intent (stages, args, labels, entrypoint), fix only what breaks a practice; list each change with its reason.
5. **Plan.** Print the Dockerfile, `.dockerignore`, and the change list (diff for existing files), then write without asking.
6. **Write** `Dockerfile` in the app dir and `.dockerignore` at the build context root (existing `.dockerignore` → append only missing entries).
7. **Verify.** Spawn `cdk:dockerfile-reviewer` with: Dockerfile path(s), `.dockerignore` path (or none), practices path `${CLAUDE_SKILL_DIR}/practices.md`, build context dir. Use its `Findings`, `Checks`, `Tool output`.
   - Review mode → report its findings; write nothing.
   - Create or update → each `error` or `warning` finding → fix, print the diff, write the fixes without asking; re-run this step (cap in Rules). `info` findings → list only.
   - Full `docker build` only when the user asks (it downloads images and runs build commands).
8. **Report** the output below.

## Output

```text
Mode: create | update | review
App: <dir> (<language runtime version>, <package manager>)
Stages: <name: image:tag@digest>, …
App files: <copied: paths | not copied>
User: <APP_USER=… APP_UID=… APP_GID=… | root>
Files: Dockerfile (<written | updated | kept>), .dockerignore (<written | updated | kept>)
Changes: <change — reason>, … | none
Skipped practices: <item — reason> | none
Checks: docker build --check <pass | fail | not installed>, hadolint <pass | fail | skipped (heredoc) | not installed>
Findings: <path:line practice id — fix>, … | none
Build: docker build -t <name> -f <Dockerfile> <context>
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```

`Findings:` lists every reviewer finding in review mode; in create or update mode, only the findings left unfixed. Review mode prints `App`, `Stages`, `User` from the existing file and leaves `Changes` at none.
