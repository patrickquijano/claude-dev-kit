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

- Stale section = an existing section whose every pattern matches no file from step 2; never `[*]`. Its `# <Types>` comment goes with it. Run `node ${CLAUDE_SKILL_DIR}/scripts/stale-sections.mjs --root <git root>` and read `stale` from its JSON (`ok: false` or a section with `note` → judge it by hand and keep it).
- Removal is confirmed by the step 6 Confirm. Kept → list under `Kept:`. Unattended → remove nothing, list each under `Open:` as "stale section: <glob>; remove it by hand or re-run interactively".
- Append one section per group, after a blank line and a `# <Types>` comment, with only its differing properties.
- Glob: one pattern as is (`[*.php]`); several → one top-level brace list (`[{*.sh,*.bash,Makefile,*.mk}]`).
- Line endings follow the file's `end_of_line`; the file's own final newline follows the `.editorconfig` type (none), not whichever section comes last.

## Plan mode

- **Plan mode (each round).** Before applying round k's fixes, call `EnterPlanMode` (load it with ToolSearch if deferred). Put the round's items (cause, chosen fix) and the files each touches in the plan, then `ExitPlanMode`; apply only what was approved. Plan mode already active → write the plan to its plan file. Rejection → revise and call `ExitPlanMode` again, at most 3 times → `Result: cancelled`, `Stopped: 8: plan rejected`. Declined, unavailable, or unattended → no fix is applied; the errors go under `Open:`.
- Unattended → no fix round plan mode; errors go under `Open:`.

## Check (step 7)

- Fix loop (step 8): rerun the checker after each correction; the step 7 run is the first pass.
- Checker = `editorconfig-checker` when `tool-check` finds it, else `ec` only when `ec-version` exits 0 and prints just a version number (another tool named `ec` fails this).
- Neither found → `Check: not run`.
