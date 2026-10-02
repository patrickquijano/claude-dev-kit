---
name: setup-editorconfig
description: Set up .editorconfig for the file types in the current repository. Detect file types, add root = true and a [*] base section if missing, then add missing per-type sections with recommended indentation and line-ending defaults, asking per type group. Use only when the user explicitly asks to set up, add, initialize, or configure EditorConfig, .editorconfig, tabs vs spaces, indentation, line endings, trailing whitespace, or final newlines, or when cdk:setup-project chains it. Do not use on your own after finishing a task.
allowed-tools: Bash(git rev-parse *) Bash(git ls-files *) Bash(command -v *) Bash(ec -version)
---

# Setup EditorConfig

## Rules

- Idempotent: a type already configured (step 3) keeps its settings, so re-runs write nothing new. Questions answered with "Use `[*]` base" or "Leave" write nothing, so they repeat on the next run.
- Defaults, globs, and reasons: `${CLAUDE_SKILL_DIR}/defaults.md`. Use only EditorConfig spec properties (`indent_style`, `indent_size`, `tab_width`, `end_of_line`, `charset`, `trim_trailing_whitespace`, `insert_final_newline`), so EditorConfig cores and plugins recognize them.
- Never change or reorder an existing section. Append new type sections at the end, because later sections win and type sections must follow `[*]`. Exception: a new `[*]` goes right after the preamble (`root = true` and leading comments), before the first section, so it never overrides existing sections.
- AskUserQuestion: at most 4 questions per call, 2–4 options each; recommended option first with its reason. Custom settings use the automatic Other option.
- Step 5 asks at most 3 batches; the catalog has fewer than 12 question groups.
- Any Stop answer or failure → print the Output with `Stopped: <step>: <reason>` and end.
- Run before `cdk:setup-format-lint`: Prettier and shfmt read `.editorconfig` for indentation, so an existing file keeps them aligned.
- Chained by `cdk:setup-project` via the Skill tool; never set `disable-model-invocation: true` (it blocks that invocation).
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/fallbacks.md`.
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `setup-editorconfig`.

## Workflow

1. **Pre-flight.** `git rev-parse --show-toplevel` fails → stop ("not a git repository; run /cdk:setup-git first"). Work from the git root.
2. **File types.** List files with `git ls-files` plus `git ls-files --others --exclude-standard`, so ignored files never count. Map each to a `defaults.md` type by extension or file name; count files per type. Types with no catalog entry, and extensionless scripts (EditorConfig matches names, not shebangs) → `uncovered`; the `[*]` base applies to them.
3. **Existing config.** Read root `.editorconfig`. A type is configured when a section glob without a path separator matches its extensions or file names (for example `[*.{js,ts}]` matches `.ts`). Catch-all sections (`[*]`, `[**]`) and path-scoped globs (`[src/**.php]`) do not count. Note nested `.editorconfig` files from step 2 in the Output; they override the root for their directory.
4. **Initialize.** Ask in one AskUserQuestion call, only the questions that apply:
   - File missing: Recommended base (Recommended; list the `defaults.md` base, which keeps every file UTF-8, LF, and newline-terminated) | Stop.
   - File exists without a `[*]` section: Recommended base (Recommended; same reason) | Type sections only (no `[*]`; step 5 compares against the `defaults.md` base and existing files keep their current base behavior) | Stop.
   - File exists without `root = true` in its preamble (match key and value case-insensitively, any spacing): Add `root = true` (Recommended; parent-directory configs would otherwise apply) | Leave.
   - Missing file → write `root = true` and the `[*]` section. `root = true` chosen → insert it as the first line. New `[*]` → insert per the Rules exception.
5. **Choose per type.** Base = the file's actual `[*]` after step 4; Type sections only → the `defaults.md` base, so each written section still lists every property. Unconfigured detected types whose properties differ from that base → group types with identical properties into one question (for example PHP, Python, and .NET at 4 spaces). Each question: Recommended defaults (Recommended; list the properties and the `defaults.md` reason) | Use `[*]` base (no section). Types whose properties equal the base → no question, no section.
6. **Write.** Append one section per chosen group, preceded by a blank line and a `# <Types>` comment. Write every property from `defaults.md` for the group, including `indent_style` and `indent_size`, so the section does not depend on `[*]`. Glob: use each type's full catalog patterns; one pattern → as is (`[*.php]`); several → one top-level brace list (`[{*.sh,*.bash,Makefile,*.mk}]`), because braces around one item are literal and nested braces mixing names and extensions are hard to read. Keep the file LF-terminated.
7. **Check.** Checker = `editorconfig-checker` when `command -v` finds it; else `ec` only when `ec -version` exits 0 and prints just a version number (the editorconfig-checker binary; another tool named `ec` fails this). Found → run it once from the git root (no writes) and count problems. Else skip. Never auto-fix; existing files keep their style until re-saved or formatted.
8. **Report** the output below, plus the editor note: VS Code needs the EditorConfig for VS Code extension; JetBrains IDEs and Visual Studio support EditorConfig natively.

## Output

```text
File types: <type (count)>, … | uncovered: <types>
.editorconfig: <created | updated | up to date> (root = true: <present | added | left out>)
Base [*]: <recommended | kept>
Sections: <glob: properties> (<added: recommended | custom>), … | none added
Kept: <glob>, … | none
Nested configs: <paths> | none
Check: <N problems> | not run
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
