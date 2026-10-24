# Flow details

## File types (step 2)

- Map each listed file to a `defaults.md` type by extension or name; count per type.
- No catalog entry, or an extensionless script (EditorConfig matches names, not shebangs) → `uncovered`; the `[*]` base applies.

## Existing config (step 3)

- A type is configured when a section glob without a path separator matches its extensions or names (`[*.{js,ts}]` matches `.ts`).
- Catch-all (`[*]`, `[**]`) and path-scoped globs (`[src/**.php]`) do not count.
- Note nested `.editorconfig` files (they override the root for their directory).

## Choose per type (step 5)

- Base = the actual `[*]` after step 4. For each unconfigured detected type keep only the `defaults.md` properties whose value differs from the base; no differing property → no section.
- Group types with identical remaining properties.

## Write (step 6)

- Stale section = an existing section whose every pattern matches no file from step 2; never `[*]`. Its `# <Types>` comment goes with it.
- Confirm removal first with AskUserQuestion, naming the effect: "Remove stale sections <globs> and their comments" (recommended) or "Keep them". Kept → list under `Kept:`. Unattended → remove nothing, list each under `Open:` as "stale section: <glob>; remove it by hand or re-run interactively".
- Append one section per group, after a blank line and a `# <Types>` comment, with only its differing properties.
- Glob: one pattern as is (`[*.php]`); several → one top-level brace list (`[{*.sh,*.bash,Makefile,*.mk}]`).
- Line endings follow the file's `end_of_line`; a trailing newline follows each section's `insert_final_newline` (types with `false` end without one).

## Check (step 7)

- Checker = `editorconfig-checker` when `tool-check` finds it, else `ec` only when `ec-version` exits 0 and prints just a version number (another tool named `ec` fails this).
- Neither found → `Check: not run`.
