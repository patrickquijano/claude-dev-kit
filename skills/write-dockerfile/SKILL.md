---
name: write-dockerfile
description: Write or improve a Dockerfile and .dockerignore from the user's input and the repo's stack, following Docker's official best practices - mandatory multi-stage builds, base images pinned to exact tag and digest through ARGs, unversioned package installs, copying only needed files, cache-friendly layer order, BuildKit cache and secret mounts, heredoc RUN blocks with merged RUN steps, optional ARG-configured non-root user, exec-form CMD - then verify with docker build checks and hadolint. Use when the user asks to write, create, generate, improve, optimize, or review a Dockerfile (review mode reports issues and writes nothing) or container image build, e.g. "write a Dockerfile", "dockerize this app", "optimize my Dockerfile", "make the Docker build cache better".
argument-hint: '<app description | path | existing Dockerfile>'
allowed-tools: Bash(git rev-parse *) Bash(command -v *) Bash(docker build --check *) Bash(docker buildx imagetools inspect *) Bash(hadolint *)
---

# Write Dockerfile

Input: $ARGUMENTS

## Rules

- No invented facts: runtime version, build and start commands, port, env vars, and system packages come from the input or the repo (manifests, lockfiles, version files, scripts, CI, existing Docker files). Not derivable → ask.
- Apply every **Required** item in [practices.md](practices.md), and every other item that fits; each item says why. Skipped item → reason in the Output. Required items: multi-stage; base images at an exact tag plus digest, via `<NAME>_IMAGE`, `<NAME>_TAG`, `<NAME>_DIGEST` ARGs; no versions in system or application package installs.
- Multi-line `RUN` → heredoc (`RUN <<EOF` … `EOF`) starting with `set -eux` (`set -eu` when it uses a secret, so `-x` never prints it), so a failing line stops the build. Consecutive `RUN` instructions in a stage with the same cache inputs → merge into one, so the image has fewer layers. Never merge across a `COPY` or across different inputs (system packages vs lockfile vs source); that would rerun installs on every source edit.
- Never put secrets in `ARG`, `ENV`, `COPY`, or the image; use secret mounts.
- Never overwrite a user file without showing the diff and asking.
- Any Stop answer or failure → print the Output with `Stopped: <step>: <reason>` and end.
- Issue → check `## Known issues` first. Fix for a recurring or workflow-blocking issue → append `- <symptom> → <fix>` to source SKILL.md (repo path, not plugin cache); not writable → print line for user.

## Workflow

1. **Analyze.** Root = `git rev-parse --show-toplevel`, else cwd. Read the input (text, paths, pasted Dockerfile) and the app dir it points to (none → root). Collect: language and runtime version (`.nvmrc`, `engines`, `.python-version`, `go` directive, `rust-toolchain`, `global.json`, …), package manager + lockfile, build command and output dir, start command, port, env vars, system packages, health endpoint, monorepo layout. Existing `Dockerfile`, `.dockerignore`, `compose*.yaml`, CI build steps → read them. Build context = the dir the build needs files from (monorepo app using shared packages → repo root); `.dockerignore` goes at the context root. Input asks only to review, score, or audit → review mode: steps 1, 3 (as findings, no draft), 6 on the existing file, 8.
2. **Clarify.** Each fact still missing or ambiguous → AskUserQuestion (max 4 per call), recommended option first with the reason: base image family (slim Debian (Recommended; glibc, broad package support) | Alpine | distroless), exact runtime version, build and start commands, port, target (production vs dev image). Derivable → don't ask. Always ask, unless the input or an existing Dockerfile already answers:
   - Copy application files into the image? Yes, only needed files (Recommended; self-contained image) | No (app mounted or supplied at run time).
   - Create a non-root user and group? Yes (Recommended; limits damage if the app is compromised) | No, run as root. Yes → ask the defaults for `APP_USER` (same name for user and group), `APP_UID`, `APP_GID`: `app`, `10001`, `10001` (Recommended; above the range distros assign to system and login accounts) | other values the user gives.
3. **Draft.** Build the `Dockerfile` from practices.md: syntax line, image `ARG`s with tag and digest (look up each digest per practices.md; never guess), build stages, runtime stage, cache mounts for the detected package manager, unversioned package installs, explicit `COPY` of needed paths only (when chosen), user and group from `ARG`s (when chosen), heredoc multi-line `RUN`s, merged `RUN`s, `.dockerignore` entries for the stack. Existing Dockerfile → keep its intent (stages, args, labels, entrypoint), fix only what breaks a practice; list each change with its reason.
4. **Approve.** Show the Dockerfile, `.dockerignore`, and the change list (diff for existing files). AskUserQuestion: Write (Recommended) | Revise | Stop. Revise → apply feedback, re-show.
5. **Write** `Dockerfile` in the app dir and `.dockerignore` at the build context root (existing `.dockerignore` → append only missing entries).
6. **Verify.** `command -v docker` → `docker build --check -f <Dockerfile> <context>`; `command -v hadolint` and the Dockerfile has no heredoc → `hadolint` with the practices.md Packages `--ignore` flags `<Dockerfile>` (the pin rules conflict with the unversioned-install rule; hadolint cannot parse heredocs; `docker build --check` covers them). Any warning or error → fix, re-run, until clean; review mode → report each as a Finding, no fix. Neither tool → say so in the Output; never install. Full `docker build` only when the user asks (it downloads images and runs build commands).
7. **Improve.** A practice was missing from practices.md, a check flagged something the rules allowed, or a workaround was needed → draft the edit (practices.md item or Known issues line) and show it. AskUserQuestion: Apply to this skill (Recommended; the next run avoids the same problem) | Skip. Apply → edit the source files (repo path, not plugin cache).
8. **Report** the output below.

## Output

```text
App: <dir> (<language runtime version>, <package manager>)
Stages: <name: image:tag@digest>, …
App files: <copied: paths | not copied>
User: <APP_USER=… APP_UID=… APP_GID=… | root>
Files: Dockerfile (<written | updated | kept>), .dockerignore (<written | updated | kept>)
Changes: <change — reason>, … | none
Skipped practices: <item — reason> | none
Checks: docker build --check <pass | fail | not installed>, hadolint <pass | fail | skipped (heredoc) | not installed>
Findings: <practice violated — line — fix>, … # review mode only
Build: docker build -t <name> -f <Dockerfile> <context>
Skill improvements: <applied | skipped | none>
Stopped: <step>: <reason>   # only when stopped
```

## Known issues

- hadolint fails on heredoc `RUN <<EOF` ("unexpected … expecting a new line") → skip hadolint for heredoc Dockerfiles; rely on `docker build --check`.
