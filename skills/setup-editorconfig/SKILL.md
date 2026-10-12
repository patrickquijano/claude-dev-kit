---
name: setup-editorconfig
description: Set up .editorconfig for the file types in the current repository. Detect file types, add root = true and a [*] base section if missing, then add missing per-type sections with recommended indentation and line-ending defaults. Use only when the user explicitly asks to set up, add, initialize, or configure EditorConfig, .editorconfig, tabs vs spaces, indentation, line endings, trailing whitespace, or final newlines, or when cdk:setup-project chains it. Do not use on your own after finishing a task.
allowed-tools: Bash(git rev-parse *) Bash(git ls-files *) Bash(command -v *) Bash(ec -version)
---

# Setup EditorConfig

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

A Context value of `<none>` means that read failed. A missing value or `[shell command execution disabled by policy]` means run that command's `commands.md` row instead.

## Rules

- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Idempotent: a type already configured (step 3) keeps its settings, so re-runs write nothing new.
- No questions: apply the `defaults.md` defaults.
- Defaults, globs, and reasons: `${CLAUDE_SKILL_DIR}/references/defaults.md`. Use only EditorConfig spec properties (`indent_style`, `indent_size`, `tab_width`, `end_of_line`, `charset`, `trim_trailing_whitespace`, `insert_final_newline`), so EditorConfig cores and plugins recognize them.
- Never change or reorder an existing section. Append new type sections at the end, because later sections win and type sections must follow `[*]`. Exception: a new `[*]` goes right after the preamble (`root = true` and leading comments), before the first section, so it never overrides existing sections.
- Pre-flight stops (step 1) → print the Output with `Resolution: not run (stopped)`, `Stopped: <step>: <reason>`, and end. Any later failure or cap → run step 8 (**Resolve findings.**) on what is left, without re-entering the loop, then print the Output with `Stopped: <step>: <reason>`.
- Run before `cdk:setup-format-lint`: Prettier and shfmt read `.editorconfig` for indentation, so an existing file keeps them aligned.
- Chained by `cdk:setup-project` via the Skill tool; never set `disable-model-invocation: true` (it blocks that invocation).
- Write unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/references/fallbacks.md`.
- Final step: follow `${CLAUDE_SKILL_DIR}/../build-skill/references/resolve-findings.md` (scope: edit; sources: `Check:` problems, `uncovered` file types).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/references/known-issues.md` with slug `setup-editorconfig` and store `${CLAUDE_PLUGIN_DATA}/known-issues`.

## Workflow

1. **Pre-flight.** Context Repo root `<none>` → stop ("not a git repository; run /cdk:setup-git first"). Work from the git root.
2. **File types.** List files with `tracked-files` plus `untracked-files`, so ignored files never count. Map each to a `defaults.md` type by extension or file name; count files per type. Types with no catalog entry, and extensionless scripts (EditorConfig matches names, not shebangs) → `uncovered`; the `[*]` base applies to them.
3. **Existing config.** Read root `.editorconfig`. A type is configured when a section glob without a path separator matches its extensions or file names (for example `[*.{js,ts}]` matches `.ts`). Catch-all sections (`[*]`, `[**]`) and path-scoped globs (`[src/**.php]`) do not count. Note nested `.editorconfig` files from step 2 in the Output; they override the root for their directory.
4. **Initialize.** No questions; apply what is missing:
   - File missing → write `root = true` and the `defaults.md` base `[*]` (every file UTF-8, LF, newline-terminated).
   - File exists without a `[*]` section → insert the `defaults.md` base per the Rules exception.
   - File exists without `root = true` in its preamble (match key and value case-insensitively, any spacing) → insert it as the first line, because parent-directory configs would otherwise apply.
5. **Choose per type.** Base = the file's actual `[*]` after step 4. Unconfigured detected types whose properties differ from that base → group types with identical properties (for example PHP, Python, and .NET at 4 spaces) and write the `defaults.md` properties for each group. Types whose properties equal the base → no section.
6. **Write.** Append one section per step 5 group, preceded by a blank line and a `# <Types>` comment, with every `defaults.md` property for the group. Detail: `${CLAUDE_SKILL_DIR}/references/write.md`.
7. **Check.** `checker` when `tool-check` finds it, else `checker-ec` under the `ec-version` test; found → run it once from the git root (no writes) and count problems, else skip. Never auto-fix. Detail: `${CLAUDE_SKILL_DIR}/references/check.md`.
8. **Resolve findings.** Per resolve-findings.md. Fix only sections this run wrote. Style problems in existing files stay `needs-decision` (step 7: never auto-fixed).
9. **Report** the output below, plus the editor note: VS Code needs the EditorConfig for VS Code extension; JetBrains IDEs and Visual Studio support EditorConfig natively.

## Output

```text
File types: <type (count)>, … | uncovered: <types>
.editorconfig: <created | updated | up to date> (root = true: <present | added>)
Base [*]: <added | kept>
Sections: <glob: properties>, … | none added
Kept: <glob>, … | none
Nested configs: <paths> | none
Check: <N problems> | not run
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
