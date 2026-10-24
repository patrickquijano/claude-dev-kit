---
name: setup-husky
description: Installs Husky Git hooks that enforce Conventional Commits and signed commits; needs signing configured first. Use only when the user explicitly asks to set up Husky or Git hooks, or when chained.
allowed-tools: Bash(git rev-parse *) Bash(git config --get *) Bash(node --version) Bash(command -v *)
---

# Setup Husky

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`
- Node version: !`node --version 2>/dev/null || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `commands.md` row.

## Rules

- Rigor: never guess or invent: confirm each path, command, and fact by reading it; ask (unattended: record) what the input and repo cannot answer. Finish every step in full, think twice before each irreversible step, and re-check the result against these rules and the repo's standards before reporting.
- Efficiency: read only what a step needs, keep output terse, and take the fewest steps that meet the goal.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Idempotent: check each step's state first and skip what is done, so re-runs change nothing.
- `${CLAUDE_SKILL_DIR}/assets/` holds the canonical hooks. Copy `.mjs` files byte for byte; stubs change only in their path prefix and step 5 flags (step 9).
- Hooks: `.husky/<hook>` is a POSIX stub `node .husky/<hook>.mjs "$@"` (Git for Windows runs hooks with its bundled `sh`); the logic lives in Node. `commit-msg.mjs` runs commitlint through the package manager: the stub's `--pm=<pm>` flag, else detected at run time.
- Run `husky-init` only when Husky is not initialized. It overwrites `scripts.prepare` and `.husky/pre-commit`, so snapshot both first; step 7 merges `prepare`, never overwrites it.
- Never overwrite a user file; never pass `--no-verify`.
- Commit header max 72 characters, enforced by `commit-msg.mjs` and the commitlint config; never raise it.
- Config edits append only missing entries. Only `.gitignore` and `.gitattributes` may be created among ignore files; `package.json`, hooks, the commitlint config, and `.claude/rules/commits.md` are created only by their steps.
- AskUserQuestion: at most 4 questions per call, 2-4 options, recommended first with its reason; each asked once. Unavailable → take the recommended option and list it under `Open:`. Unattended (chained by `cdk:setup-project`) → same.
- Caps: install 1 attempt; fix loop for smoke-test failures and files this run wrote 3 rounds. A kept user file is never replaced: report its diff and how to overwrite it. Leftovers go under `Open:`.
- Pre-flight stops and a Stop answer: print the Output with `Result: stopped | cancelled`.
- Chained via the Skill tool; never set `disable-model-invocation`.

## Workflow

1. **Pre-flight.** Repo root `<none>` → stop ("not a git repository"). Node version `<none>` → stop ("install Node.js").
2. **Package dir.** Per `package-manager.md` Package dir. `<pkg>` = package dir relative to the git root (`.` at root).
3. **Package manager.** Per `package-manager.md` Detect; `<exec>` and the add command come from its Commands table.
4. **package.json.** Missing → create it per `package-manager.md` Missing package.json.
5. **Hook events + signing.** Reuse the choice of existing asset stubs; else commit-msg message check plus signed check (commit-msg pre-check, post-commit report). Pre-check chosen and signing config missing → stop ("run /cdk:setup-git first"). `hooks.md` Events.
6. **Install.** Missing from `dependencies` and `devDependencies`: `husky`, `@commitlint/cli`, `@commitlint/config-conventional` (skip it when an existing commitlint config does not extend it). One add command in package dir, with the workspace-root flag per `package-manager.md`. Fail → quote the error line, stop.
7. **Initialize Husky.** Ask before replacing another hook owner (lefthook, pre-commit, `.git/hooks` files); `hooks-path` check; not initialized → snapshot, `husky-init`, merge `prepare`; always `run-prepare`. `init.md`.
8. **pre-commit.** Only when init ran. Snapshot had a file → restore it. Else keep init's file only when `scripts.test` exists and is not npm's placeholder; otherwise delete it (a placeholder blocks every commit).
9. **Hooks.** Copy each chosen hook and its `.mjs` to `<package dir>/.husky/` (absent → copy, identical → skip, differs → keep and report); `chmod-exec` copied stubs. `hooks.md` Copy.
10. **Commitlint config.** Existing → keep and enforce header ≤72; none → copy `assets/commitlintrc.json` to `.commitlintrc.json`. `hooks.md` Commitlint config.
11. **Commit rules.** Message check skipped → skip. Copy `assets/commit-rules.md` to `.claude/rules/commits.md` at the git root (absent → write, identical → skip, differs → keep and report). Report when root `CLAUDE.md` does not mention commit rules; never edit it.
12. **Git ignore.** Append `<pkg>/.husky/_/` (`.husky/_/` at root) to root `.gitignore`, creating it if missing; linters read only the root one.
13. **Line endings.** Append `<pkg>/.husky/* text eol=lf` (`.husky/* text eol=lf` at root) to root `.gitattributes`, creating it if missing, unless an identical `eol=lf` line exists (CRLF breaks the `sh` stubs).
14. **Tool ignores.** Add the Husky paths to each existing linter, formatter, npm, and Docker config. `ignores.md`.
15. **Smoke test.** No commit-msg hook (or a kept user stub not calling `commit-msg.mjs`) → skip. Else `smoke-commit-msg` on valid, past-tense, and 73-char headers. `hooks.md` Smoke test.
16. **Fix loop.** Repair failing checks on files this run wrote, up to the cap; list the rest under `Open:`.
17. **Report** the Output.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For package dir, package manager detection, and a missing `package.json` (steps 2-4), see `${CLAUDE_SKILL_DIR}/references/package-manager.md`.
- For hook events, copying hooks, the commitlint config, and the smoke test (steps 5, 9, 10, 15), see `${CLAUDE_SKILL_DIR}/references/hooks.md`.
- For `hooksPath`, `prepare` merging, and init (step 7), see `${CLAUDE_SKILL_DIR}/references/init.md`.
- For tool ignore entries (step 14), see `${CLAUDE_SKILL_DIR}/references/ignores.md`.
- Copied into the project (never read): `${CLAUDE_SKILL_DIR}/assets/` (hooks, `commitlintrc.json`, `commit-rules.md`).

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
Hooks: commit-msg <copied|same|kept|removed>, commit-msg.mjs <...>, post-commit <...>, post-commit.mjs <...>
Commitlint config: <file> (<kept | written>; header-max-length <added | present | kept <value> | report-only>)
Rules: .claude/rules/commits.md (<written | same | kept>); CLAUDE.md mention <present | missing>
Line endings: .gitattributes (<added | created | up to date>)
Ignores: <file: added path>, ... | up to date
Smoke test: <pass/fail lines> | skipped (<reason>)
CI: set HUSKY=0 in CI and Docker builds to skip hook install.
Open: <item: impact; recommended fix, ...> | none
Next: /cdk:commit-changes | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
