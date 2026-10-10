---
name: write-dockerfile
description: Write, improve, or review a Dockerfile and .dockerignore for the repo's stack per Docker's official best practices (multi-stage, digest-pinned base images, cache and secret mounts, optional non-root user), verified by docker build --check (and hadolint when the file has no heredoc). Use only when the user explicitly asks to write, create, dockerize, optimize, or review a Dockerfile or container image build. Do not use on your own after finishing a task.
argument-hint: '<app description | path | existing Dockerfile>'
allowed-tools: Bash(git rev-parse *) Bash(command -v *) Bash(docker buildx imagetools inspect *) WebFetch(domain:hub.docker.com)
---

# Write Dockerfile

Input: $ARGUMENTS

## Rules

- User interaction (AskUserQuestion) and writes only here; `cdk:dockerfile-reviewer` only reviews.
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/fallbacks.md`.
- No invented facts: runtime version, build and start commands, port, env vars, and system packages come from the input or the repo (manifests, lockfiles, version files, scripts, CI, existing Docker files). Not derivable → ask (default target only).
- Apply every **Required** item in `${CLAUDE_SKILL_DIR}/practices.md`, and every other item that fits; each item says why. Skipped item → reason in the Output. Required items: multi-stage; distribution order Debian, Ubuntu, Alpine (first the runtime's official image supports, slim when compatible); base images at an exact tag (never `latest`, `lts`, or a bare major) plus digest, resolved at run time per practices.md, via `<NAME>_IMAGE`, `<NAME>_TAG`, `<NAME>_DIGEST` ARGs; tools from official or trusted images via a digest-pinned stage and `COPY --link --from` instead of installs; no versions in system or application package installs (freshness comes from unversioned system and package-manager upgrades); caches, indexes, build dependencies, and temp files removed in the same layer (cache-mounted paths exempt). Input `target=devcontainer` → practices `## Devcontainer target` replaces the items it names.
- Multi-line `RUN` → heredoc (`RUN <<EOF` … `EOF`) starting with `set -eux` (`set -eu` when it uses a secret, so `-x` never prints it), so a failing line stops the build. Consecutive `RUN` instructions in a stage with the same cache inputs → merge into one, so the image has fewer layers. Never merge across a `COPY` or across different inputs (system packages vs lockfile vs source); that would rerun installs on every source edit.
- Checks: `docker build --check` is the primary check. hadolint runs only on a heredoc-free Dockerfile, since it cannot parse heredocs, so under the heredoc rule it usually reports `skipped (heredoc)`.
- Never put secrets in `ARG`, `ENV`, `COPY`, or the image; use secret mounts.
- Every write to an existing file (step 6 and step 7 fixes) prints its diff; no approval asked, since the files are local and the diff is reviewable.
- Loops: clarify (step 3) max 3 AskUserQuestion calls, then Stopped with the facts still missing; verify-fix (step 7) max 3 attempts, still failing → Stopped.
- Step 3 cap hit, or a failure before findings exist → print the Output, `Result: stopped`, `Stopped: <step>: <reason>`, and end. Step 7 cap hit, or a failure after findings exist → run step 8 (**Resolve findings.**) on what is left, without re-entering the loop, then print the Output with `Result: stopped`, `Stopped: <step>: <reason>`, and end.
- Chained by `cdk:setup-devcontainer` via the Skill tool; never set `disable-model-invocation: true` (it blocks that invocation).
- Final step: follow `${CLAUDE_SKILL_DIR}/../build-skill/resolve-findings.md` (scope: edit; sources: unfixed `Findings:`, `Skipped practices:`, `Checks:` fail or not installed).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `write-dockerfile`.

## Workflow

1. **Pre-flight.** Root = `git rev-parse --show-toplevel`, else cwd. Read the input (text, paths, pasted Dockerfile); app dir = the dir it points to (`dir=`), else root. Target: input `target=devcontainer` → devcontainer, else default. Devcontainer input keys (space-separated `key=value`, values with spaces in double quotes): `dir=`, `context=` (build context), `base=<image>:<tag>`, `packages=<a,b,…>`, `sudoers="<line>"`, `copy=<src>:<dest>,…`. Mode: input asks only to review, score, or audit → review (writes nothing); Dockerfile exists in the app dir → update; else create. Review mode, no Dockerfile → report it, suggest create mode, end with `Result: nothing-to-do`.
2. **Analyze.** Collect: language and runtime version (`.nvmrc`, `engines`, `.python-version`, `go` directive, `rust-toolchain`, `global.json`, …), package manager + lockfile, build command and output dir, start command, port, env vars, system packages, health endpoint, monorepo layout. Existing `Dockerfile`, `.dockerignore`, `compose*.yaml`, CI build steps → read them. Build context = `context=`, else the dir the build needs files from (monorepo app using shared packages → repo root); `.dockerignore` goes at the context root. Devcontainer target → collect only the existing Dockerfile and the context's files; the input gives the rest. Review mode → step 7, then steps 8 and 9.
3. **Clarify.** Devcontainer target → skip this step entirely. Each fact still missing or ambiguous → AskUserQuestion (max 4 per call), recommended option first with the reason: exact runtime version, build and start commands, port. Derivable → don't ask. Apply these Recommended defaults without asking, unless the input or an existing Dockerfile already answers, and list them in the Output: copy only the needed application files into the image (self-contained image); create a non-root user and group with `APP_USER=app`, `APP_UID=10001`, `APP_GID=10001` (limits damage if the app is compromised; above the range distros assign to system and login accounts); Debian slim base unless its official runtime image lacks one (then Ubuntu, then Alpine; glibc, broad package support); purpose production unless the input says dev or devcontainer.
4. **Draft.** Build the `Dockerfile` from practices.md: syntax line, image `ARG`s with tag and digest (resolve each tag, then look up its digest, per practices.md; never guess; a failed lookup is asked once under the step 3 cap (devcontainer target: stop, never ask; review mode: only report)), build stages, runtime stage, cache mounts for the detected package manager, unversioned package installs plus system and package-manager upgrades and same-layer cleanup, trusted-tool stages with `COPY --link --from`, explicit `COPY` of needed paths only (when chosen), user and group from `ARG`s (when chosen), heredoc multi-line `RUN`s, merged `RUN`s, `.dockerignore` entries for the stack. Update mode → keep its intent (stages, args, labels, entrypoint), fix only what breaks a practice; list each change with its reason.
5. **Plan.** Print the Dockerfile, `.dockerignore`, and the change list (diff for existing files), then write without asking.
6. **Write** `Dockerfile` in the app dir and `.dockerignore` at the build context root (existing `.dockerignore` → append only missing entries).
7. **Verify.** Spawn `cdk:dockerfile-reviewer` with: Dockerfile path(s), `.dockerignore` path (or none), practices path `${CLAUDE_SKILL_DIR}/practices.md`, build context dir, target (default | devcontainer). Use its `Findings`, `Checks`, `Tool output`.
   - Review mode → report its findings; write nothing.
   - Create or update → each `error` or `warning` finding → fix, print the diff, write the fixes without asking; re-run this step (cap in Rules). `info` findings → list only.
   - Full `docker build` only when the user asks (it downloads images and runs build commands).
8. **Resolve findings.** Per resolve-findings.md. Edit only the `Dockerfile` and `.dockerignore` this run wrote or updated; review mode writes nothing, so its items are reported with their recommended fix. Itemize the unfixed `Findings:`; `Checks:` fail or not installed (a skipped hadolint for a heredoc is not an item). Devcontainer target chained by `cdk:setup-devcontainer` is unattended: ask nothing.
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
Checks: docker build --check <pass | fail | not installed>, hadolint <pass | fail | skipped (heredoc) | not installed>
Findings: <path:line practice id — fix>, … | none
Build: docker build -t <name> -f <Dockerfile> <context>
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```

`Findings:` lists every reviewer finding in review mode; in create or update mode, only the findings left unfixed. Review mode prints `App`, `Stages`, `User` from the existing file and leaves `Changes` at none. Devcontainer target prints `App: <dir> (devcontainer)`, `User: (from image)`, and `Build: n/a (the devcontainer CLI builds it)`.
