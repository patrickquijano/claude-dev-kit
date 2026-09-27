---
name: setup-husky
description: Install and configure Husky Git hooks in the current project. Detect the package manager, create package.json if missing, install husky and commitlint, add cross-platform commit-msg and post-commit hooks that block unsigned or non-conforming commits, keep hook files LF in .gitattributes, and add Husky paths to git, linter, formatter, npm, and Docker ignores. Use when the user asks to set up, install, add, or configure Husky, Git hooks, commit message checks, or signed-commit checks.
allowed-tools: Bash(git rev-parse *) Bash(git config --get *) Bash(node --version) Bash(command -v *)
---

# Setup Husky

Input: $ARGUMENTS

## Rules

- Idempotent: check each step's state first and skip what is already done, so re-runs change nothing.
- Assets in `${CLAUDE_SKILL_DIR}/assets/` are the canonical hooks. Copy `.mjs` files byte for byte, so every project reports the same way. Stubs change only in their path prefix (step 9).
- Hooks: `.husky/<hook>` is a POSIX stub `node .husky/<hook>.mjs "$@"`. Git for Windows runs hooks with its bundled `sh`, so one stub works on every platform; the logic lives in Node.
- Run `husky init` only when Husky is not initialized. It overwrites `scripts.prepare` and `.husky/pre-commit`, so snapshot both first; step 7 merges `prepare`, never overwrites it.
- Never overwrite a user file without asking; never pass `--no-verify`.
- Config edits: append only missing entries, keep existing ones. Only `.gitignore` and `.gitattributes` may be created; tool configs follow [ignores.md](ignores.md).
- Any Stop answer or failure → print the Output with `Stopped: <step>: <reason>` and end.
- Issue → check `## Known issues` first. Fix for a recurring or workflow-blocking issue → append `- <symptom> → <fix>` to source SKILL.md (repo path, not plugin cache); not writable → print line for user.

## Workflow

1. **Preflight.** `git rev-parse --show-toplevel` fails → stop ("not a git repository"). `node --version` fails → stop ("install Node.js").
2. **Package dir.** Git root has `package.json` with `workspaces`, or has `pnpm-workspace.yaml` → git root (monorepo: hooks belong at the root). Else nearest `package.json` from cwd up to the git root. It is not the git root → AskUserQuestion: `<nearest dir>` (Recommended; that package owns the tooling) | Git root. None → git root. `<pkg>` = package dir relative to git root (`.` at root).
3. **Package manager.** `packageManager` field → name before `@` (`pnpm@9.1.0+sha…` → pnpm). Else lockfile in package dir or git root: `pnpm-lock.yaml` pnpm, `yarn.lock` yarn, `bun.lock` or `bun.lockb` bun, `package-lock.json` npm. None or more than one → AskUserQuestion: npm (Recommended; ships with Node) | pnpm | yarn | bun. `command -v <pm>` fails → stop. Exec prefix: npm `npx`, pnpm `pnpm exec`, yarn `yarn`, bun `bunx`.
4. **package.json.** Missing → write `{ "name": "<dir name, lowercase kebab-case>", "private": true }`. Never run `<pm> init`: `bun init` and `yarn init` scaffold extra files, and `npm init` copies every package in an existing `node_modules/` into `dependencies`.
5. **Signing.** The commit-msg hook blocks commits when `commit.gpgsign` is not `true` or `user.signingkey` is unset. `git config --get commit.gpgsign` is not `true` or `git config --get user.signingkey` is empty → AskUserQuestion: Stop and configure signing first (Recommended; commits would be blocked) | Install anyway.
6. **Install.** Collect packages absent from both `dependencies` and `devDependencies`: `husky`, `@commitlint/cli`, and `@commitlint/config-conventional` (skip it when an existing commitlint config does not extend it). Install all in one command: `npm install -D`, `pnpm add -D`, `yarn add -D`, or `bun add -d`. Fail → quote the error line, stop.
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
9. **Hooks.** Source `${CLAUDE_SKILL_DIR}/assets/`, target `<package dir>/.husky/`. Git runs hooks from the git root, so when `<pkg>` ≠ `.`, replace `.husky/` in each stub with `<pkg>/.husky/`; the `.mjs` resolves its own package dir. For `commit-msg`, `commit-msg.mjs`, `post-commit`, `post-commit.mjs`: absent → copy; identical → skip; differs → show the diff, AskUserQuestion: Keep existing (Recommended; user-authored) | Overwrite. On macOS/Linux `chmod +x` both stubs.
10. **Commitlint config.** Any `commitlint.config.*`, `.commitlintrc`, `.commitlintrc.*`, or `commitlint` key in `package.json` in package dir → keep it; the hook uses it. Else copy `${CLAUDE_SKILL_DIR}/assets/.commitlintrc.json`: Conventional Commits, header ≤72, subject only, no `Co-authored-by`. The hook adds an imperative-mood check on top.
11. **Git ignore.** Husky writes `.husky/_/.gitignore` containing `*`, so git already skips `.husky/_/`. Still append `<pkg>/.husky/_/` (`.husky/_/` at root) to root `.gitignore`, creating it if missing, because linters that read `.gitignore` do not read nested ones.
12. **Line endings.** The stubs are POSIX `sh`; a CRLF checkout (Git for Windows `core.autocrlf=true`) breaks them. Entry: `<pkg>/.husky/* text eol=lf` (`.husky/* text eol=lf` at root). Append it to root `.gitattributes`, creating the file if missing, unless a line with that exact pattern already sets `eol=lf`. Appending puts it last, so it wins over broader patterns such as `* text eol=crlf`.
13. **Tool ignores.** Add the Husky paths to each existing linter, formatter, npm, and Docker config per [ignores.md](ignores.md), in that tool's syntax.
14. **Smoke test.** From the git root, write `feat: add husky hooks` to a file in the OS temp dir and run `node <pkg>/.husky/commit-msg.mjs <file>`; expect `✅ Commit Message`. Repeat with `feat: added husky hooks`; expect `❌ Commit Message` (imperative check). Delete the temp file. Report the `Signed` line as printed; `❌ Signed` shows why commits stay blocked.
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
Hooks: commit-msg <copied|same|kept>, commit-msg.mjs <…>, post-commit <…>, post-commit.mjs <…>
Commitlint config: <file> (<kept | written>)
Line endings: .gitattributes (<added | created | up to date>)
Ignores: <file: added path>, … | up to date
Smoke test: <✅/❌ lines>
CI: set HUSKY=0 in CI and Docker builds to skip hook install.
Stopped: <step>: <reason>   # only when stopped
```

## Known issues

- `npm init` in a project with `node_modules/` filled `dependencies` with every transitive package → write `package.json` directly (step 4).
