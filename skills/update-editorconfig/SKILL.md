---
name: update-editorconfig
description: Creates or updates .editorconfig for repo file types only: 4-space base, final newline except Git, Markdown, text; confirms first. Use only when the user explicitly asks to update EditorConfig.
compatibility: Claude Code only. Uses disable-model-invocation and CLAUDE_SKILL_DIR; claude.ai and API uploads reject unknown frontmatter keys.
allowed-tools: Bash(git rev-parse *) Bash(git ls-files *) Bash(command -v *) Bash(ec -version) Bash(editorconfig-checker) Bash(ec)
disable-model-invocation: true
---

# Update EditorConfig

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `repo-root` row of `commands.md`.

## Rules

- Rigor: never guess or invent: confirm each path, command, and fact by reading it; ask (unattended: record) what the input and repo cannot answer. Finish every step in full, think twice before each irreversible step, and re-check the result against these rules and the repo's standards before reporting.
- Efficiency: read only what a step needs, keep output terse, and take the fewest steps that meet the goal.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- No questions except the step 6 write confirmation (which carries the stale-removal ask): apply the defaults in `${CLAUDE_SKILL_DIR}/references/defaults.md`. Use only EditorConfig spec properties (`indent_style`, `indent_size`, `tab_width`, `end_of_line`, `charset`, `trim_trailing_whitespace`, `insert_final_newline`).
- Idempotent: a type already configured (step 3) keeps its settings, so a re-run writes nothing new.
- Only the repo's file types get a section, and a section holds only properties that differ from the actual `[*]`; never repeat a base property.
- Never change or reorder an existing section, except removing a confirmed stale one (step 6). Append new type sections at the end, because later sections win and must follow `[*]`. Exception: a new `[*]` goes right after the preamble (`root = true` and leading comments), before the first section.
- Run before setup-format-lint: Prettier and shfmt read `.editorconfig` for indentation.
- Fix loop: at most 2 passes over problems in sections this run wrote; the checker never auto-fixes, and style problems in existing files are never touched.
- Leftovers (still-failing checks, `uncovered` types) go under `Open:` in the Output, never silently dropped.
- Write tool unavailable: print the file content as plain text and end the turn. Unattended: ask nothing.

## Workflow

1. **Pre-flight.** Context Repo root `<none>` → stop ("not a git repository; run /cdk:setup-git first"). Work from the git root.
2. **File types.** List `tracked-files` plus `untracked-files` (ignored files never count); map and count per type. No catalog entry → `uncovered` ([flow](${CLAUDE_SKILL_DIR}/references/flow.md)).
3. **Existing config.** Read root `.editorconfig`; mark each type already configured and note nested configs ([rules](${CLAUDE_SKILL_DIR}/references/flow.md)).
4. **Initialize.** Plan what is missing; step 6 writes it after the confirm:
   - File missing → write `root = true` and the `defaults.md` base `[*]`.
   - No `[*]` section → insert the base per the Rules exception.
   - No `root = true` in the preamble (key and value case-insensitive, any spacing) → insert it as the first line.
5. **Choose per type.** Keep only the `defaults.md` properties that differ from the actual `[*]`; group identical sets ([flow](${CLAUDE_SKILL_DIR}/references/flow.md)).
6. **Write.** Print the sections to append and the stale ones to remove, confirm once, then write ([flow](${CLAUDE_SKILL_DIR}/references/flow.md) `## Write` and `## Confirm`). Step 4 inserts wait for this confirm. Unattended → remove nothing, list under `Open:`.
7. **Check.** Run `checker` (or `checker-ec`) once from the git root and count problems; no checker found → skip ([flow](${CLAUDE_SKILL_DIR}/references/flow.md)).
8. **Fix.** Problems in sections this run wrote → correct the section and re-run the check (cap in Rules). Anything else → `Open:`.
9. **Report** the Output.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For per-step branches (type mapping, configured-type matching, grouping, stale removal, checker choice), see `${CLAUDE_SKILL_DIR}/references/flow.md` (read at steps 2, 3, 5, 6, 7; the write confirm is `## Confirm`).
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
Confirmed: yes | revised <n> | no (stopped) | unattended | n/a (up to date or stopped earlier)
Next: /cdk:setup-format-lint | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
