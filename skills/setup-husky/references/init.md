# Initialize Husky

Step 7 detail. Commands run by name from `commands.md`.

- Other hook owners first: `lefthook.{yml,yaml,json}` or `.lefthook.*`, `.pre-commit-config.yaml`, or a non-`.sample` file in the hooks dir (`<root>/.git/hooks` when `core.hooksPath` is unset and `.git` is a directory; check with Glob) → the plan (checked read-only during plan mode) names replacing it with Husky (you migrate them yourself); not named in the approved plan → stop. Unattended: stop and list under `Open:`.
- `hooks-path`: unset, or ends in `.husky/_` → ok. `.husky` or `<pkg>/.husky` (legacy Husky layout) → migrate, no prompt. Other → another hook manager owns the hooks there; replaced only when the approved plan names it, else stop. Unattended: stop and list under `Open:`; never replace a foreign `core.hooksPath`.
- Initialized = `<package dir>/.husky/_/h` exists and `core.hooksPath` ends in `<pkg>/.husky/_` (`.husky/_` at root) → skip init.
- Not initialized → snapshot `scripts.prepare` and `.husky/pre-commit` (content or absent), then run `husky-init` in package dir. Fail → quote the error line, stop. In a non-root package, init prints `.git can't be found` and installs nothing; the prepare run below installs.
- Merge: run `merge-prepare` with `--pkg <pkg>` and `--existing` set to the snapshot (or the current value when init was skipped; omit when absent). Write its `prepare` to `scripts.prepare`, discarding init's `"husky"`; never overwrite an existing value any other way. `action` is `set`, `unchanged`, `replaced` (a legacy Husky segment swapped), or `merged` (target appended after existing commands); report it as the Output `prepare` state.
- Always run `run-prepare`, so `.husky/_/` exists and `core.hooksPath` points to it.
