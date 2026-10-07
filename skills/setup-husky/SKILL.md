---
name: setup-husky
description: Install and configure Husky Git hooks in the current project. Detect the package manager, create package.json if missing, install husky and commitlint, run the commit message and signed-commit checks on the recommended hook events, add cross-platform Node hooks for them, keep hook files LF in .gitattributes, and add Husky paths to git, linter, formatter, npm, and Docker ignores. Use only when the user explicitly asks to set up, install, add, or configure Husky, Git hooks, commit message checks, or signed-commit checks, or when cdk:setup-project chains it. Do not use on your own after finishing a task.
allowed-tools: Bash(git rev-parse *) Bash(git config --get *) Bash(node --version) Bash(command -v *)
---

# Setup Husky

## Rules

- Idempotent: check each step's state first and skip what is already done, so re-runs change nothing.
- Assets in `${CLAUDE_SKILL_DIR}/assets/` are the canonical hooks. Copy `.mjs` files byte for byte, so every project reports the same way. Stubs change only in their path prefix and step 5 flags (step 9).
- Hooks: `.husky/<hook>` is a POSIX stub `node .husky/<hook>.mjs "$@"`. Git for Windows runs hooks with its bundled `sh`, so one stub works on every platform; the logic lives in Node. `commit-msg.mjs` runs commitlint with the commitlint docs command for the package manager (`npx --no -- commitlint`, `pnpm commitlint`, `yarn commitlint`, `bun commitlint`): the stub's `--pm=<pm>` flag, else detected at run time in the `${CLAUDE_SKILL_DIR}/package-manager.md` order, so the copy stays byte-identical.
- Run `husky init` only when Husky is not initialized. It overwrites `scripts.prepare` and `.husky/pre-commit`, so snapshot both first; step 7 merges `prepare`, never overwrites it.
- Never overwrite a user file; never pass `--no-verify`.
- AskUserQuestion: at most 4 questions per call, 2–4 options each; recommended option first with its reason. Each question is asked at most once per run; no re-ask loops.
- Config edits: append only missing entries, keep existing ones. Of the ignore and attribute files, only `.gitignore` and `.gitattributes` may be created; tool configs follow `${CLAUDE_SKILL_DIR}/ignores.md`. `package.json` (step 4), hooks (step 9), and the commitlint config (step 10) are created only by their steps.
- Any Stop answer or failure → print the Output with `Stopped: <step>: <reason>` and end.
- Chained by `cdk:setup-project` via the Skill tool; never set `disable-model-invocation: true` (it blocks that invocation).
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/fallbacks.md`.
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `setup-husky`.

## Workflow

1. **Pre-flight.** `git rev-parse --show-toplevel` fails → stop ("not a git repository"). `node --version` fails → stop ("install Node.js").
2. **Package dir.** Per `${CLAUDE_SKILL_DIR}/package-manager.md` Package dir (monorepo: hooks belong at the root). `<pkg>` = package dir relative to git root (`.` at root).
3. **Package manager.** Per `${CLAUDE_SKILL_DIR}/package-manager.md` Detect; `<exec>` and the add command come from its Commands table.
4. **package.json.** Missing → per `${CLAUDE_SKILL_DIR}/package-manager.md` Missing package.json (Husky needs it).
5. **Hook events + signing.** Existing asset stubs map back to a choice: commit-msg stub without `--skip-message` → message on, else off; commit-msg stub without `--skip-signing` → pre-check on; post-commit stub → report on; a missing stub turns its part off. Either asset stub exists → reuse that choice. Else, no question:
   - Commit message check: commit-msg (the only hook that gets the final message file as `$1` and can block before the commit exists).
   - Signed check: commit-msg pre-check + post-commit report (git can verify a signature only after the commit object exists, so commit-msg blocks on missing signing config and post-commit confirms the real signature).
   - Stub flags: message skipped → `--skip-message`; signing pre-check not chosen → `--skip-signing`; step 3 asked the user → `--pm=<pm>`, because run-time detection could pick another lockfile's manager. commit-msg stub = `node .husky/commit-msg.mjs <flags> "$@"`; both checks off commit-msg → no commit-msg hook. post-commit report chosen → post-commit hook. Message skipped → also skip the commitlint packages (step 6) and config (step 10). Both checks skipped → nothing to install but Husky.
   - Signing pre-check chosen: the hook blocks commits when `commit.gpgsign` is not `true`, `user.signingkey` is unset, or (`gpg.format` = `ssh`) `gpg.ssh.allowedSignersFile` is unset. Any of `git config --get commit.gpgsign` not `true`, `git config --get user.signingkey` empty, or `gpg.format` = `ssh` with `git config --get gpg.ssh.allowedSignersFile` empty, missing, or not listing the signing public key → stop ("run /cdk:setup-git first"; commits would be blocked), no question.
6. **Install.** Collect packages absent from both `dependencies` and `devDependencies`: `husky`, `@commitlint/cli`, and `@commitlint/config-conventional` (skip it when an existing commitlint config does not extend it). Install all in one command in package dir with the package-manager.md add command. Fail → quote the error line, stop.
7. **Initialize Husky.**
   - `git config --get core.hooksPath`: unset, or ends in `.husky/_` → ok. `.husky` or `<pkg>/.husky` (legacy Husky layout) → migrate, no prompt. Other → AskUserQuestion: Replace with Husky (Recommended) | Stop; another hook manager owns the hooks there.
   - Initialized = `<package dir>/.husky/_/h` exists and `core.hooksPath` ends in `<pkg>/.husky/_` (`.husky/_` at root) → skip init.
   - Not initialized → snapshot `scripts.prepare` and `.husky/pre-commit` (content or absent), then run `<exec> husky init` in package dir. Fail → quote the error line, stop. In a non-root package, init prints `.git can't be found` and installs nothing; the prepare run below installs.
   - Target `prepare`: `<pkg>` = `.` → `husky`; else `cd <package-dir-to-root> && husky <pkg>/.husky` (Husky how-to, project not in git root).
   - Merge target into the snapshot (or current value when init was skipped); never overwrite it. Split on `&&` and trim. A Husky segment starts with `husky`; a `cd <dir>` segment directly before it belongs to it.
     - Absent or empty → set target.
     - Contains target → keep.
     - Has a different Husky segment (for example legacy `husky install`) → replace only that segment with target; keep other segments and their order.
     - No Husky segment → `<existing> && <target>`, so existing commands run first.
     - Write the result to `scripts.prepare`, discarding init's `"husky"`.
   - Always run `<pm> run prepare`, so `.husky/_/` exists and `core.hooksPath` points to it.
8. **pre-commit.** Only when init ran. Snapshot had a file → restore its content; init clobbered a user hook. Snapshot absent → keep init's `.husky/pre-commit` only when `scripts.test` exists and is not npm's placeholder `echo "Error: no test specified" && exit 1`; else delete it, because a missing or placeholder test blocks every commit.
9. **Hooks.** Source `${CLAUDE_SKILL_DIR}/assets/`, target `<package dir>/.husky/`. Git runs hooks from the git root, so when `<pkg>` ≠ `.`, replace `.husky/` in each stub with `<pkg>/.husky/`; the `.mjs` resolves its own package dir. Add the step 5 flags to the commit-msg stub. For each hook chosen in step 5 and its `.mjs` (`commit-msg`, `commit-msg.mjs`, `post-commit`, `post-commit.mjs`): absent → copy; identical → skip; differs → keep the existing file (user-authored; drops the step 5 choice for that hook) and report the diff and how to overwrite (delete it, then rerun). Asset hook present but not chosen in step 5 → AskUserQuestion: Remove (Recommended; it would keep running) | Keep. On macOS/Linux `chmod +x` each copied stub.
10. **Commitlint config.** Any `commitlint.config.*`, `.commitlintrc`, `.commitlintrc.*`, or `commitlint` key in `package.json` in package dir → keep it; the hook uses it. Else copy `${CLAUDE_SKILL_DIR}/assets/.commitlintrc.json`: Conventional Commits, header ≤72, subject only, no `Co-authored-by`. The hook adds an imperative-mood check on top.
11. **Git ignore.** Husky writes `.husky/_/.gitignore` containing `*`, so git already skips `.husky/_/`. Still append `<pkg>/.husky/_/` (`.husky/_/` at root) to root `.gitignore`, creating it if missing, because linters that read `.gitignore` do not read nested ones.
12. **Line endings.** The stubs are POSIX `sh`; a CRLF checkout (Git for Windows `core.autocrlf=true`) breaks them. Entry: `<pkg>/.husky/* text eol=lf` (`.husky/* text eol=lf` at root). Append it to root `.gitattributes`, creating the file if missing, unless a line with that exact pattern already sets `eol=lf`. Appending puts it last, so it wins over broader patterns such as `* text eol=crlf`.
13. **Tool ignores.** Add the Husky paths to each existing linter, formatter, npm, and Docker config per `${CLAUDE_SKILL_DIR}/ignores.md`, in that tool's syntax.
14. **Smoke test.** No commit-msg hook, or a kept user stub that does not call `commit-msg.mjs` → skip. From the git root, run each check below with the stub's flags; with `--skip-message` still write the file but skip both message expectations. Write `feat: add husky hooks` to a file in the OS temp dir and run `node <pkg>/.husky/commit-msg.mjs <file>`; expect `✅ Commit Message`. Repeat with `feat: added husky hooks`; expect `❌ Commit Message` (imperative check). Pass the stub's flags before `<file>`. Delete the temp file. Report the `Signed` line as printed; `❌ Signed` shows why commits stay blocked.
15. **Report** the output below.

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
Commitlint config: <file> (<kept | written>)
Line endings: .gitattributes (<added | created | up to date>)
Ignores: <file: added path>, … | up to date
Smoke test: <✅/❌ lines>
CI: set HUSKY=0 in CI and Docker builds to skip hook install.
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
