---
name: update-editorconfig
description: Creates or updates .editorconfig for repo file types only: 4-space base, final newline except Git, Markdown, text. Use only when the user explicitly asks to update EditorConfig, or when chained.
allowed-tools: Bash(git rev-parse *) Bash(git ls-files *) Bash(command -v *) Bash(ec -version) Bash(editorconfig-checker) Bash(ec)
---

# Update EditorConfig

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `repo-root` row of `commands.md`.

## Rules

- Rigor: never guess or invent: confirm each path, command, and fact by reading it; ask (unattended: record) what the input and repo cannot answer. Finish every step in full, think twice before each irreversible step, and re-check the result against these rules and the repo's standards before reporting.
- Efficiency: read only what a step needs, keep output terse, and take the fewest steps that meet the goal; when work is autonomous and splits cleanly, spawn independent cdk subagents in one parallel turn (`cdk:task-worker` for read-only work, `cdk:plan-implementer` for edits), never `Explore` or `general-purpose`.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- No questions: apply the defaults in `${CLAUDE_SKILL_DIR}/references/defaults.md`. Use only EditorConfig spec properties (`indent_style`, `indent_size`, `tab_width`, `end_of_line`, `charset`, `trim_trailing_whitespace`, `insert_final_newline`).
- Idempotent: a type already configured (step 3) keeps its settings, so a re-run writes nothing new.
- Only the repo's file types get a section, and a section holds only properties that differ from the actual `[*]`; never repeat a base property.
- Never change or reorder an existing section, except removing a stale one (step 6). Append new type sections at the end, because later sections win and must follow `[*]`. Exception: a new `[*]` goes right after the preamble (`root = true` and leading comments), before the first section.
- Run before `cdk:setup-format-lint`: Prettier and shfmt read `.editorconfig` for indentation.
- Fix loop: at most 2 passes over problems in sections this run wrote; the checker never auto-fixes, and style problems in existing files are never touched.
- Leftovers (still-failing checks, `uncovered` types) go under `Open:` in the Output, never silently dropped.
- Write tool unavailable: print the file content as plain text and end the turn. Unattended (chained): ask nothing.
- Chained by `cdk:setup-project` through the Skill tool, so it never sets `disable-model-invocation`.

## Workflow

1. **Pre-flight.** Context Repo root `<none>` → stop ("not a git repository; run /cdk:setup-git first"). Work from the git root.
2. **File types.** List `tracked-files` plus `untracked-files` (ignored files never count). Map each to a `defaults.md` type by extension or name; count per type. No catalog entry, or an extensionless script (EditorConfig matches names, not shebangs) → `uncovered`; the `[*]` base applies.
3. **Existing config.** Read root `.editorconfig`. A type is configured when a section glob without a path separator matches its extensions or names (`[*.{js,ts}]` matches `.ts`). Catch-all (`[*]`, `[**]`) and path-scoped globs (`[src/**.php]`) do not count. Note nested `.editorconfig` files (they override the root for their directory).
4. **Initialize.** Apply what is missing:
   - File missing → write `root = true` and the `defaults.md` base `[*]`.
   - No `[*]` section → insert the base per the Rules exception.
   - No `root = true` in the preamble (key and value case-insensitive, any spacing) → insert it as the first line.
5. **Choose per type.** Base = the actual `[*]` after step 4. For each unconfigured detected type keep only the `defaults.md` properties whose value differs from the base; no differing property → no section. Group types with identical remaining properties (Makefile and Go at `indent_style = tab`; Git files, EditorConfig, and Text at `insert_final_newline = false`; Shell joins the tab group only when the base `indent_size` is 4).
6. **Write.** First remove each existing section whose every pattern matches no file from step 2 (a stale type), with its `# <Types>` comment; never `[*]`. Then append one section per group, after a blank line and a `# <Types>` comment, with only its differing properties. Glob: one pattern as is (`[*.php]`); several → one top-level brace list (`[{*.sh,*.bash,Makefile,*.mk}]`). Keep the file LF-terminated.
7. **Check.** Checker = `editorconfig-checker` when `tool-check` finds it, else `ec` only when `ec-version` exits 0 and prints just a version number (another tool named `ec` fails this). Found → run it once from the git root and count problems; else skip.
8. **Fix.** Problems in sections this run wrote → correct the section and re-run the check (cap in Rules). Anything else → `Open:`.
9. **Report** the Output, plus the editor note: VS Code needs the EditorConfig for VS Code extension; JetBrains IDEs and Visual Studio support EditorConfig natively.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For the base `[*]` block (4 spaces, final newline), type globs (no final newline for Git files, `.editorconfig`, Markdown, text), override properties, and reasons, see `${CLAUDE_SKILL_DIR}/references/defaults.md` (read at step 2).

## Output

```text
File types: <type (count)>, … | uncovered: <types>
.editorconfig: <created | updated | up to date> (root = true: <present | added>)
Base [*]: <added | kept>
Sections: <glob: properties>, … | none added
Removed: <glob>, … | none
Kept: <glob>, … | none
Nested configs: <paths> | none
Check: <N problems> | not run
Open: <problem or uncovered type: reason; recommended fix>, … | none
Next: /cdk:setup-format-lint | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
