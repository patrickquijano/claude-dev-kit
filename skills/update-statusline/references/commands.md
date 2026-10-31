# Commands

| Name           | Command                                                 | Purpose                                   |
| -------------- | ------------------------------------------------------- | ----------------------------------------- |
| `node-version` | `node --version`                                        | Fails when Node.js is missing (preloaded) |
| `timestamp`    | `date +%Y%m%d-%H%M%S`                                   | Backup suffix                             |
| `backup`       | `cp <file> <file>.bak-<timestamp>`                      | Back up before a change                   |
| `copy-asset`   | `cp ${CLAUDE_SKILL_DIR}/assets/statusline.mjs <target>` | Create when no status line exists         |
| `chmod-exec`   | `chmod +x <target>`                                     | Optional, for a script run directly       |
| `smoke`        | `printf '%s' '<json>' \| node <script>`                 | Render with a sample session              |
| `smoke-plain`  | `printf '%s' '<json>' \| NO_COLOR=1 node <script>`      | Render without color                      |
