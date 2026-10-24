# CLI

Step 1 detail. Commands run by name from `commands.md`.

- `has-specify` succeeds → skip the install.
- Else `has-uv` fails → report "install uv: <https://docs.astral.sh/uv/>", stop.
- Else AskUserQuestion ("Install specify-cli v1.2.2 globally", "Stop"). Stop or unattended → `Stopped: 1: specify-cli not installed`, `Open:` the `install-specify` command.
- Confirmed → run `install-specify`. Install fails → quote the error line, stop.
- Install succeeds but `has-specify` still fails → tell the user to run `uv tool update-shell` and restart the shell, stop.
- Record `version`.
