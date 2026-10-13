---
name: setup-husky
description: Install and configure Husky Git hooks. Add cross-platform Node hooks for Conventional Commits (header max 72 characters) and signed-commit checks. Stops until signing is configured (run cdk:setup-git first). Use only when the user explicitly asks to set up Husky or Git hooks, or when cdk:setup-project chains it. Do not use on your own after finishing a task.
allowed-tools: Bash(git rev-parse *) Bash(git config --get *) Bash(node --version) Bash(command -v *)
---

# Setup Husky

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`
- Node version: !`node --version 2>/dev/null || echo '<none>'`

A Context value of `<none>` means that read failed. A missing value or `[shell command execution disabled by policy]` means run that command's `commands.md` row instead.

## Rules

- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Idempotent: check each step's state first and skip what is already done, so re-runs change nothing.
- Assets in `${CLAUDE_SKILL_DIR}/assets/` are the canonical hooks. Copy `.mjs` files byte for byte, so every project reports the same way. Stubs change only in their path prefix and step 5 flags (step 9).
- Hooks: `.husky/<hook>` is a POSIX stub `node .husky/<hook>.mjs "$@"`. Git for Windows runs hooks with its bundled `sh`, so one stub works on every platform; the logic lives in Node. `commit-msg.mjs` runs commitlint with the commitlint docs command for the package manager (`npx --no -- commitlint`, `pnpm commitlint`, `yarn commitlint`, `bun commitlint`): the stub's `--pm=<pm>` flag, else detected at run time in the `${CLAUDE_SKILL_DIR}/references/package-manager.md` order, so the copy stays byte-identical.
- Run `husky-init` only when Husky is not initialized. It overwrites `scripts.prepare` and `.husky/pre-commit`, so snapshot both first; step 7 merges `prepare`, never overwrites it.
- Never overwrite a user file; never pass `--no-verify`.
- AskUserQuestion: at most 4 questions per call, 2–4 options each; recommended option first with its reason. Each question is asked at most once per run; no re-ask loops.
- Config edits: append only missing entries, keep existing ones. Of the ignore and attribute files, only `.gitignore` and `.gitattributes` may be created; tool configs follow `${CLAUDE_SKILL_DIR}/references/ignores.md`. `package.json` (step 4), hooks (step 9), the commitlint config (step 10), and `.claude/rules/commits.md` (step 11) are created only by their steps.
- Commit header max 72 characters, enforced by `commit-msg.mjs` itself and by commitlint config; never raise it.
- Pre-flight stops (step 1) and Stop answers (cancels) → print the Output with `Resolution: not run (stopped | cancelled)`, `Stopped: <step>: <reason>`, and end. Any later failure or cap → run step 16 (**Resolve findings.**) on what is left, without re-entering the loop, then print the Output with `Stopped: <step>: <reason>`.
- Chained by `cdk:setup-project` via the Skill tool; never set `disable-model-invocation: true` (it blocks that invocation).
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/../shared/references/fallbacks.md`.
- Final step: follow `${CLAUDE_SKILL_DIR}/../shared/references/resolve-findings.md` (scope: edit; sources: smoke test results (step 15) and the `Signed` line, kept files that differ from the assets, `CLAUDE.md mention: missing` in `Rules:`, `Commitlint config:` with `report-only` or `kept <value>`).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../shared/references/known-issues.md` with slug `setup-husky` and store `${CLAUDE_PLUGIN_DATA}/known-issues`.

## Workflow

1. **Pre-flight.** Context Repo root `<none>` → stop ("not a git repository"). Context Node version `<none>` → stop ("install Node.js").
2. **Package dir.** Per `${CLAUDE_SKILL_DIR}/references/package-manager.md` Package dir (monorepo: hooks belong at the root). `<pkg>` = package dir relative to git root (`.` at root).
3. **Package manager.** Per `${CLAUDE_SKILL_DIR}/references/package-manager.md` Detect; `<exec>` and the add command come from its Commands table.
4. **package.json.** Missing → per `${CLAUDE_SKILL_DIR}/references/package-manager.md` Missing package.json (Husky needs it).
5. **Hook events + signing.** Existing asset stubs map back to a choice (reuse it); else no question: commit message check on commit-msg, signed check = commit-msg pre-check + post-commit report. Signing config missing (`gpgsign`, `signingkey`, `allowed-signers`) → stop ("run /cdk:setup-git first"). Detail: `${CLAUDE_SKILL_DIR}/references/hook-events.md`.
6. **Install.** Collect packages absent from both `dependencies` and `devDependencies`: `husky`, `@commitlint/cli`, and `@commitlint/config-conventional` (skip it when an existing commitlint config does not extend it). Install all in one command in package dir with the package-manager.md add command. Fail → quote the error line, stop.
7. **Initialize Husky.** Check `hooks-path`; not initialized → snapshot `scripts.prepare` and `.husky/pre-commit`, then `husky-init`; merge the target `prepare` (never overwrite it); always `run-prepare`. Detail: `${CLAUDE_SKILL_DIR}/references/init.md`.
8. **pre-commit.** Only when init ran. Snapshot had a file → restore its content; init clobbered a user hook. Snapshot absent → keep init's `.husky/pre-commit` only when `scripts.test` exists and is not npm's placeholder `echo "Error: no test specified" && exit 1`; else delete it, because a missing or placeholder test blocks every commit.
9. **Hooks.** Copy each chosen hook and its `.mjs` from `${CLAUDE_SKILL_DIR}/assets/` to `<package dir>/.husky/` (absent → copy, identical → skip, differs → keep and report); `chmod-exec` copied stubs on macOS/Linux. Detail: `${CLAUDE_SKILL_DIR}/references/hooks.md`.
10. **Commitlint config.** Existing config → keep it and enforce header ≤72 in it; none → copy `${CLAUDE_SKILL_DIR}/assets/.commitlintrc.json`. Detail: `${CLAUDE_SKILL_DIR}/references/commitlint-config.md`.
11. **Commit rules.** Message check skipped → skip. Copy `${CLAUDE_SKILL_DIR}/assets/commit-rules.md` to `.claude/rules/commits.md` at the git root: absent → write (create `.claude/rules/`); identical → skip; differs → keep the user's file, report it. Then check the project `CLAUDE.md` (root) mentions commits rules or `.claude/rules/`; missing → report it, never edit it.
12. **Git ignore.** Husky writes `.husky/_/.gitignore` containing `*`, so git already skips `.husky/_/`. Still append `<pkg>/.husky/_/` (`.husky/_/` at root) to root `.gitignore`, creating it if missing, because linters that read `.gitignore` do not read nested ones.
13. **Line endings.** The stubs are POSIX `sh`; a CRLF checkout (Git for Windows `core.autocrlf=true`) breaks them. Entry: `<pkg>/.husky/* text eol=lf` (`.husky/* text eol=lf` at root). Append it to root `.gitattributes`, creating the file if missing, unless a line with that exact pattern already sets `eol=lf`. Appending puts it last, so it wins over broader patterns such as `* text eol=crlf`.
14. **Tool ignores.** Add the Husky paths to each existing linter, formatter, npm, and Docker config per `${CLAUDE_SKILL_DIR}/references/ignores.md`, in that tool's syntax.
15. **Smoke test.** No commit-msg hook, or a kept user stub that does not call `commit-msg.mjs` → skip. Else run `smoke-commit-msg` on a valid, a past-tense, and a 73-char header, and report the `Signed` line as printed. Detail: `${CLAUDE_SKILL_DIR}/references/smoke-test.md`.
16. **Resolve findings.** Per resolve-findings.md. Fix only files this run wrote or copied. A kept user file stays as is: report its diff and how to overwrite it, never replace it.
17. **Report** the output below.

## Output

```text
Package: <pkg> (<root | nearest | workspace root>)
Package manager: <pm> (<packageManager | lockfile | chosen>)
package.json: created | present
Installed: <packages> | already present
hooksPath: ok | migrated from <old> | replaced <old>
prepare: <script> (<set | merged | unchanged>)
Init: ran | already initialized
pre-commit: removed | kept (test script) | restored | untouched
Events: message <commit-msg | skipped>, signing <pre-check + report | pre-check | report | skipped> | kept user hook
Hooks: commit-msg <copied|same|kept|removed>, commit-msg.mjs <…>, post-commit <…>, post-commit.mjs <…>
Commitlint config: <file> (<kept | written>; header-max-length <added | present | kept <value> | report-only>)
Rules: .claude/rules/commits.md (<written | same | kept>); CLAUDE.md mention <present | missing>
Line endings: .gitattributes (<added | created | up to date>)
Ignores: <file: added path>, … | up to date
Smoke test: <✅/❌ lines> | skipped (<reason>)
CI: set HUSKY=0 in CI and Docker builds to skip hook install.
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
