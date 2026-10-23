# Initialize Husky

Step 7 detail. Commands run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`.

- Other hook owners first: `lefthook.{yml,yaml,json}` or `.lefthook.*`, `.pre-commit-config.yaml`, or a non-`.sample` file in the hooks dir (`<root>/.git/hooks` when `core.hooksPath` is unset and `.git` is a directory; check with Glob) → AskUserQuestion: Stop, keep existing hooks (Recommended) | Replace with Husky (you migrate them yourself). Unattended: stop and list under `Open:`.
- `hooks-path`: unset, or ends in `.husky/_` → ok. `.husky` or `<pkg>/.husky` (legacy Husky layout) → migrate, no prompt. Other → AskUserQuestion: Replace with Husky (Recommended) | Stop; another hook manager owns the hooks there. Unattended: stop and list under `Open:`; never replace a foreign `core.hooksPath`.
- Initialized = `<package dir>/.husky/_/h` exists and `core.hooksPath` ends in `<pkg>/.husky/_` (`.husky/_` at root) → skip init.
- Not initialized → snapshot `scripts.prepare` and `.husky/pre-commit` (content or absent), then run `husky-init` in package dir. Fail → quote the error line, stop. In a non-root package, init prints `.git can't be found` and installs nothing; the prepare run below installs.
- Target `prepare`: `<pkg>` = `.` → `husky`; else `cd <package-dir-to-root> && husky <pkg>/.husky` (Husky how-to, project not in git root).
- Merge target into the snapshot (or current value when init was skipped); never overwrite it. Split on `&&` and trim. A Husky segment starts with `husky`; a `cd <dir>` segment directly before it belongs to it.
  - Absent or empty → set target.
  - Contains target → keep.
  - Has a different Husky segment (for example legacy `husky install`) → replace only that segment with target; keep other segments and their order.
  - No Husky segment → `<existing> && <target>`, so existing commands run first.
  - Write the result to `scripts.prepare`, discarding init's `"husky"`.
- Always run `run-prepare`, so `.husky/_/` exists and `core.hooksPath` points to it.
