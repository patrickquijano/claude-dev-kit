# Step details

## Contents

- CLI (step 2) · Names (step 6) · Git ignore (step 7)

## CLI

`has-graphify` succeeds → skip. Else AskUserQuestion ("Install graphifyy 0.9.93 globally", "Stop"); Stop or unattended → `Stopped: 2: graphify not installed`, `Open:` the install command. Install: `has-uv` succeeds → `install-uv`; else `has-pipx` succeeds → `install-pipx`; neither → report "install uv: <https://docs.astral.sh/uv/>", stop. Install fails → quote the error line, stop. Install succeeds but `has-graphify` still fails → tell the user to run `uv tool update-shell` (uv) or `pipx ensurepath` (pipx) and restart the shell, stop. Record `version`.

## Names

Placeholder names come from `graphify update` or a label-less build. Say `label-missing` spends LLM tokens (an API key, or the `claude` CLI on its subscription; neither → graphify falls back to hub-based names, no LLM), then run it once: it keeps existing names and names only the placeholders. Fails → quote the error line, report the placeholders as left, continue. Grep again and report how many remain.

## Git ignore

`graphify-out/*`, not `graphify-out/`: git cannot re-include a file whose parent folder is excluded. An existing `graphify-out/` or `/graphify-out` line blocks the negations → unattended: keep the line, report `kept local only`, record under `Open:`; else AskUserQuestion: Replace it with the block (Recommended; shares the graph and report with the team) | Keep local only. Keep local only → leave the line, report it. Tell the user the post-commit hook rebuilds the tracked `graph.json`, so it shows as modified after commits and goes in the next commit.
