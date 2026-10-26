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
- Removal is approved in `## Plan mode`. Kept → list under `Kept:`. Unattended → remove nothing, list each under `Open:` as "stale section: <glob>; remove it by hand or re-run interactively".
- Append one section per group, after a blank line and a `# <Types>` comment, with only its differing properties.
- Glob: one pattern as is (`[*.php]`); several → one top-level brace list (`[{*.sh,*.bash,Makefile,*.mk}]`).
- Line endings follow the file's `end_of_line`; the file's own final newline follows the `.editorconfig` type (none), not whichever section comes last.

## Plan mode

Runs once, right after step 1 passes. Unattended → `Plan mode: skipped (unattended)`.

- Plan mode already active → `already active`, stay in it. Otherwise load `EnterPlanMode` with ToolSearch if it is deferred, then call it. The user declines it, or the tool is unavailable → `declined`, `Result: stopped`, `Stopped: 6: plan mode declined`, `Confirmed: no (stopped)`; nothing is written.
- Steps 2–6 before the write run inside plan mode: they only read, run `stale-sections.mjs`, and ask.
- Nothing to write (no `root = true`, base, section, or removal) → no plan file and no `ExitPlanMode`; `Confirmed: n/a (up to date)`, `Result: nothing-to-do`.
- Stale sections exist → AskUserQuestion before the plan: **Remove stale sections <globs> and their comments** (Recommended; no file matches them) · **Keep them**, plus Stop (`Result: cancelled`, `Confirmed: no (stopped)`). Kept → list under `Kept:`.
- The plan file holds: the content to add (`root = true`, the base `[*]`, each section with its properties); each stale section to remove, with its comment; the effects (`.editorconfig` created or updated, "never commits"); one reason line citing file types, stale globs, nested configs, and `uncovered` types. Call `ExitPlanMode`.
- Approval (`Confirmed: yes`) covers the write, the listed removals, and this run's fix-loop edits to the sections it wrote; they print their diff and need no new ask.
- Rejection → revise per the feedback (back to step 5) and call `ExitPlanMode` again; 3 rejections → `Result: cancelled`, `Stopped: 6: plan rejected`, `Confirmed: no (stopped)`. `Confirmed: revised <n>` counts the revisions.
- Unattended → no plan mode; write the base and sections, `Confirmed: unattended`; stale sections go to `Open:`.
- Any end before the write prints the Output with `Plan mode:` as reached (`skipped (<reason>)` when never entered).

## Check (step 7)

- Fix loop (step 8): rerun the checker after each correction; the step 7 run is the first pass.
- Checker = `editorconfig-checker` when `tool-check` finds it, else `ec` only when `ec-version` exits 0 and prints just a version number (another tool named `ec` fails this).
- Neither found → `Check: not run`.
