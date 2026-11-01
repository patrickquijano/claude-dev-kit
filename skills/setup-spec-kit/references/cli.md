# CLI

Step 1 detail. Commands run by name from `commands.md`.

- `has-specify` succeeds → skip the install.
- Else `has-uv` fails → report "install uv: <https://docs.astral.sh/uv/>", stop.
- Else run `latest-tag` and take its `tag` as `<tag>` (`ok: false` → quote the error, stop).
- Else run `install-specify` with `<tag>`. Install fails → quote the error line, stop.
- Install succeeds but `has-specify` still fails → tell the user to run `uv tool update-shell` and restart the shell, stop.
- Record `version`.
