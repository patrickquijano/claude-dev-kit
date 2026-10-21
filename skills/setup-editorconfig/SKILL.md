---
name: setup-editorconfig
description: Sets up .editorconfig for the repo's file types with a root base section and per-type indentation and line endings. Use only when the user explicitly asks to set up EditorConfig, or when chained.
allowed-tools: Bash(git rev-parse *) Bash(git ls-files *) Bash(command -v *) Bash(ec -version) Bash(editorconfig-checker) Bash(ec)
---

# Setup EditorConfig

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `repo-root` row of `commands.md`.

## Rules

- Rigor: never guess or invent: confirm each path, command, and fact by reading it; ask (unattended: record) what the input and repo cannot answer. Finish every step in full, think twice before each irreversible step, and re-check the result against these rules and the repo's standards before reporting.
- Efficiency: read only what a step needs, keep output terse, and take the fewest steps that meet the goal; when work is autonomous and splits cleanly, spawn independent subagents in one parallel turn.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- No questions: apply the defaults in `${CLAUDE_SKILL_DIR}/references/defaults.md`. Use only EditorConfig spec properties (`indent_style`, `indent_size`, `tab_width`, `end_of_line`, `charset`, `trim_trailing_whitespace`, `insert_final_newline`).
- Idempotent: a type already configured (step 3) keeps its settings, so a re-run writes nothing new.
- Never change or reorder an existing section. Append new type sections at the end, because later sections win and must follow `[*]`. Exception: a new `[*]` goes right after the preamble (`root = true` and leading comments), before the first section.
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
5. **Choose per type.** Base = the actual `[*]` after step 4. Unconfigured detected types whose properties differ from it → group types with identical properties (PHP, Python, .NET at 4 spaces). Types equal to the base get no section.
6. **Write.** Append one section per group, after a blank line and a `# <Types>` comment, with every `defaults.md` property for the group (so it does not depend on `[*]`). Glob: one pattern as is (`[*.php]`); several → one top-level brace list (`[{*.sh,*.bash,Makefile,*.mk}]`). Keep the file LF-terminated.
7. **Check.** Checker = `editorconfig-checker` when `tool-check` finds it, else `ec` only when `ec-version` exits 0 and prints just a version number (another tool named `ec` fails this). Found → run it once from the git root and count problems; else skip.
8. **Fix.** Problems in sections this run wrote → correct the section and re-run the check (cap in Rules). Anything else → `Open:`.
9. **Report** the Output, plus the editor note: VS Code needs the EditorConfig for VS Code extension; JetBrains IDEs and Visual Studio support EditorConfig natively.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For the base `[*]` block, type globs, properties, and reasons, see `${CLAUDE_SKILL_DIR}/references/defaults.md` (read at step 2).

## Output

```text
File types: <type (count)>, … | uncovered: <types>
.editorconfig: <created | updated | up to date> (root = true: <present | added>)
Base [*]: <added | kept>
Sections: <glob: properties>, … | none added
Kept: <glob>, … | none
Nested configs: <paths> | none
Check: <N problems> | not run
Open: <problem or uncovered type: reason; recommended fix>, … | none
Next: /cdk:setup-format-lint | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
