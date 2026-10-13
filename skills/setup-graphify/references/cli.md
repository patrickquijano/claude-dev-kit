# CLI

Step 2 detail. Commands run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`.

`has-graphify` succeeds → skip. Else `has-uv` succeeds → `install-uv`; else `has-pipx` succeeds → `install-pipx`; neither → report "install uv: <https://docs.astral.sh/uv/>", stop. Install fails → quote the error line, stop. Install succeeds but `has-graphify` still fails → tell the user to run `uv tool update-shell` (uv) or `pipx ensurepath` (pipx) and restart the shell, stop. Record `version`.
