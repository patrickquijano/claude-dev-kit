# Context note

Details step 7 of `${CLAUDE_SKILL_DIR}/SKILL.md`.

- Target: first heading matching `/test/i` in `CLAUDE.md` or `.claude/CLAUDE.md`, else in `.claude/rules/*.md` (first match by file name) → put the note under it; none → append `## Testing` with the note to whichever of `CLAUDE.md` or `.claude/CLAUDE.md` exists (prefer `.claude/CLAUDE.md` when only it exists), else create `CLAUDE.md`. Match the heading as a word (`Test`, `Testing`, `Tests`), never inside another word.
- Note: one line per kind and package: the run command (from the Scripts step, else stacks.md) and the targeted-run form from stacks.md Targeted runs. Say that integration and e2e suites are separate and slower, so run them only when asked or when the change touches their boundary.
- Same text already there → `unchanged`. A different earlier note of this skill → replace it, never duplicate; replacing or rewriting lines the user wrote → AskUserQuestion: Rewrite (Recommended) | Skip.
- Other context files that tell Claude to run a kind this note covers (`AGENTS.md`, `.claude/rules/*.md`, a `CLAUDE.md` Commands section) → show each line and propose the replacement in the same prompt.
- Report the text and target file.
