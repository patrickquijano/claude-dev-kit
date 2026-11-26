# Commands

| Name           | Command                                                 | Purpose                                   |
| -------------- | ------------------------------------------------------- | ----------------------------------------- |
| `node-version` | `node --version`                                        | Fails when Node.js is missing (preloaded) |
| `timestamp`    | `date +%Y%m%d-%H%M%S`                                   | Backup suffix                             |
| `backup`       | `cp <file> <file>.bak-<timestamp>`                      | Back up before a change                   |
| `copy-asset`   | `cp ${CLAUDE_SKILL_DIR}/assets/statusline.mjs <target>` | Create when no status line exists         |
| `chmod-exec`   | `chmod +x <target>`                                     | Optional, for a script run directly       |
| `smoke`        | `printf '%s' '<json>' \| <runner> <script>`             | Render with a sample session              |
| `smoke-plain`  | `printf '%s' '<json>' \| NO_COLOR=1 <runner> <script>`  | Render without color                      |

- `<runner>` follows the script's file type: `node` for `.mjs` or `.js`, `bash` for `.sh`, `python3` for `.py`; any other type runs the script by its own path (its shebang), and a script with no shebang → stop and report.
- `allowed-tools` pins the default `~/.claude/statusline.mjs`; a status line script at another path (backup, `chmod-exec`, smoke) runs through a permission prompt.
