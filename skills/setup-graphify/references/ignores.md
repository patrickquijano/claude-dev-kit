# Lint and format ignores

Step 8 detail.

Generated JSON, Markdown, and HTML only add noise. Add `graphify-out/` to each existing config in that tool's syntax from `${CLAUDE_SKILL_DIR}/../setup-husky/references/ignores.md` (Linters and formatters and Docker lines; `<entry>` = `graphify-out/`, Biome negation `!**/graphify-out`, ignore form `graphify-out`). Skip conditions in that file that rely on `.gitignore` do not apply: step 7 un-ignores two files there, so tools that read `.gitignore` would lint them. dprint has no entry syntax there: report it instead of editing. Skip the npm line; report that the shared graph files are the user's call for a published package.
