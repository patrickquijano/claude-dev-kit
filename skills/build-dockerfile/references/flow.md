# Flow

## Contents

- Pre-flight · Analyze · Clarify · Draft · Verify

## Pre-flight

Root = `repo-root`, else cwd. Read the input (text, paths, pasted Dockerfile); app dir = `dir=`, else root. Target: `target=devcontainer` → devcontainer, else default. Devcontainer keys (space-separated `key=value`, values with spaces in double quotes): `dir=`, `context=` (build context), `base=<image>:<tag>`, `packages=<a,b,…>`, `sudoers="<line>"`, `copy=<src>:<dest>,…`. Mode: input asks only to review, score, or audit → review (writes nothing); Dockerfile exists in the app dir → update; else create. Review mode, no Dockerfile → report it, suggest create mode, `Result: nothing-to-do`.

## Analyze

Collect: runtime and version (`.nvmrc`, `engines`, `.python-version`, `go` directive, `rust-toolchain`, `global.json`, …), package manager and lockfile, build command and output dir, start command, port, env vars, system packages, health endpoint, monorepo layout. Read an existing `Dockerfile`, `.dockerignore`, `compose*.yaml`, and CI build steps. Build context = `context=`, else the dir the build needs files from (monorepo app with shared packages → repo root); `.dockerignore` goes at the context root. Devcontainer target → collect only the existing Dockerfile and the context's files; the input gives the rest.

## Clarify

Devcontainer target → skip. Each missing or ambiguous fact → AskUserQuestion (max 4 per call), recommended option first with the reason: exact runtime version, build and start commands, port. Derivable → do not ask. Apply these defaults without asking unless the input or an existing Dockerfile answers, and list them in the Output:

- Copy only the needed application files into the image (self-contained image).
- Non-root user and group: `APP_USER=app`, `APP_UID=10001`, `APP_GID=10001` (limits damage if compromised; above the range distros assign to system and login accounts).
- Debian slim base unless its official runtime image lacks one (then Ubuntu, then Alpine).
- Purpose production unless the input says dev or devcontainer.

## Draft

Build the `Dockerfile` from practices.md in this order: syntax and check lines, image `ARG`s with tag and digest (resolve the tag, then run `image-digest` per practices.md; never guess; a failed lookup is asked once under the Clarify cap; devcontainer target: stop with `Stopped: 4: digest lookup needs docker`; review mode: report only), build stages, runtime stage, cache mounts for the package manager, unversioned installs with upgrades and same-layer cleanup, trusted-tool stages with `COPY --link --from`, explicit `COPY` of needed paths, user and group from `ARG`s, heredoc and merged `RUN`s. Add `.dockerignore` entries for the stack. Update mode → keep its intent (stages, args, labels, entrypoint), fix only what breaks a practice, list each change with its reason.

## Verify

Spawn `cdk:practices-reviewer` with: `kind: dockerfile`, Dockerfile path(s), `.dockerignore` path (or none), practices path `${CLAUDE_SKILL_DIR}/references/practices.md`, build context dir, target (default | devcontainer). Use its `Findings`, `Checks`, `Tool output`.

- Review mode → report findings; write nothing.
- Create or update → each `error` or `warning` → fix, print the diff, write, re-run (cap in Rules). `info` → list only.
- Full `docker build` only when the user asks (it downloads images and runs build commands).
- Leftovers: unfixed findings, skipped practices, a failed or missing check (a tool `error` gets no fix loop; skipped hadolint for a heredoc is not a leftover). Review mode lists each with its recommended fix.
