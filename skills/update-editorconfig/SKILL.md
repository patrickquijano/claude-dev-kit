---
name: update-editorconfig
description: Creates or updates .editorconfig for repo file types only: 4-space base, final newline except Git, Markdown, text; confirmed before writing. Use when asked to update EditorConfig.
compatibility: Claude Code only. Uses CLAUDE_SKILL_DIR; claude.ai and API uploads reject unknown frontmatter keys.
allowed-tools: Bash(git rev-parse *) Bash(git ls-files *) Bash(command -v *) Bash(ec -version) Bash(editorconfig-checker) Bash(ec) Bash(node ${CLAUDE_SKILL_DIR}/scripts/stale-sections.mjs *)
---

# Update EditorConfig

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `repo-root` row of `commands.md`.

## Rules

- Unattended = run by a hook, no AskUserQuestion: record what the input and repo cannot answer.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- No questions except the step 6 stale-removal ask and Confirm: apply the defaults in `${CLAUDE_SKILL_DIR}/references/defaults.md`. Use only EditorConfig spec properties (`indent_style`, `indent_size`, `tab_width`, `end_of_line`, `charset`, `trim_trailing_whitespace`, `insert_final_newline`).
- Idempotent: a type already configured (step 3) keeps its settings, so a re-run writes nothing new.
- Only the repo's file types get a section, and a section holds only properties that differ from the actual `[*]`; never repeat a base property.
- Never change or reorder an existing section, except removing an approved stale one (step 6). Append new type sections at the end, because later sections win and must follow `[*]`. Exception: a new `[*]` goes right after the preamble (`root = true` and leading comments), before the first section.
- Write only after the step 6 Confirm Yes; declined → `Result: cancelled`. Unattended: no Confirm.
- Fix loop: at most 2 passes over syntax or glob errors in sections this run wrote; the checker never auto-fixes, and style problems in existing files are never touched.
- Leftovers (still-failing checks, `uncovered` types) go under `Open:` in the Output, never silently dropped.
- Write tool unavailable: print the file content and the Output with `Stopped: 6: Write unavailable`, then end the turn. Unattended: ask nothing.

## Workflow

1. **Pre-flight.** Context Repo root `<none>` → stop ("not a git repository; initialize one first"). Work from the git root.
2. **File types.** List `tracked-files` plus `untracked-files` (ignored files never count); map and count per type. No catalog entry → `uncovered` ([flow](${CLAUDE_SKILL_DIR}/references/flow.md)).
3. **Existing config.** Read root `.editorconfig`; mark each type already configured and note nested configs ([flow](${CLAUDE_SKILL_DIR}/references/flow.md)).
4. **Initialize.** Plan what is missing; step 6 writes it after the Confirm:
   - File missing → write `root = true` and the `defaults.md` base `[*]`.
   - No `[*]` section → insert the base per the Rules exception.
   - No `root = true` in the preamble (key and value case-insensitive, any spacing) → insert it as the first line.
5. **Choose per type.** Keep only the `defaults.md` properties that differ from the actual `[*]`; group identical sets ([flow](${CLAUDE_SKILL_DIR}/references/flow.md)).
6. **Write.** Print the sections to append and the stale ones to remove, ask the stale-removal question. **Confirm.** State in at most 3 lines what will change, then ask Yes | No with AskUserQuestion; proceed only on Yes, else `Result: cancelled`. Then write ([flow](${CLAUDE_SKILL_DIR}/references/flow.md) `## Write`). Step 4 inserts wait for the Confirm. Unattended: no Confirm, remove nothing, and list stale sections under `Open:`.
7. **Check.** Run `checker` (or `checker-ec`) from the git root for the first pass and count problems; no checker found → skip ([flow](${CLAUDE_SKILL_DIR}/references/flow.md)).
8. **Fix.** Syntax or glob errors in sections this run wrote → enter plan mode per `flow.md` `## Plan mode` (each round), correct the section, and re-run the check (cap in Rules). Per-file violations and anything else → `Open:`.
9. **Report** the Output.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md` (read when running a named command, steps 1-9).
- For per-step branches (type mapping, configured-type matching, grouping, stale removal, checker choice), see `${CLAUDE_SKILL_DIR}/references/flow.md` (read at steps 2, 3, 5, 6, 7; fix-round plan mode is `## Plan mode`).
- For the base `[*]` block (4 spaces, final newline), type globs (no final newline for Git files, `.editorconfig`, Markdown, text), override properties, and reasons, see `${CLAUDE_SKILL_DIR}/references/defaults.md` (read at steps 2, 4, 5).
- For the stale-section finder (step 6; run, never read), see `${CLAUDE_SKILL_DIR}/scripts/stale-sections.mjs`.
- For the evals (only when testing or changing this skill), see `${CLAUDE_SKILL_DIR}/references/evals.md`.

## Output

```text
Plan mode: entered | already active | declined | skipped (<reason>)
File types: <type (count)>, … | uncovered: <types>
.editorconfig: <created | updated | up to date> (root = true: <present | added>)
Base [*]: <added | kept>
Sections: <glob: properties>, … | none added
Removed: <glob>, … | none
Kept: <glob>, … | none
Nested configs: <paths> | none
Check: <N problems before fix, M after> | not run
Open: <problem or uncovered type: reason; recommended fix>, … | none
Confirmed: yes | revised <n> | no (stopped) | unattended | n/a (up to date or stopped earlier)
Next: set up formatters and linters if wanted | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
