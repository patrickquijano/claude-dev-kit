# Commands

| Name                     | Command                                                                                            | Purpose                             |
| ------------------------ | -------------------------------------------------------------------------------------------------- | ----------------------------------- |
| `has-specify`            | `command -v specify`                                                                               | Succeeds when installed             |
| `has-uv`                 | `command -v uv`                                                                                    | Succeeds when uv exists             |
| `latest-tag`             | `node ${CLAUDE_SKILL_DIR}/scripts/plan-extensions.mjs --latest-tag`                                | Prints the highest `vX.Y.Z` tag     |
| `install-specify`        | `uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@<tag>`              | Install Spec Kit CLI                |
| `version`                | `specify --version`                                                                                | Installed version                   |
| `integration-install`    | `specify integration install claude`                                                               | Add Claude integration              |
| `init-here`              | `specify init --here --integration claude --force --non-interactive`                               | Initialize the current project      |
| `extension-list`         | `specify extension list --json`                                                                    | Installed extensions and priorities |
| `extension-add`          | `specify extension add <id> --priority <n>`                                                        | Install an extension                |
| `extension-set-priority` | `specify extension set-priority <id> <n>`                                                          | Change an extension priority        |
| `extension-reinstall`    | `specify extension remove <id> --keep-config --force && specify extension add <id> --priority <n>` | Reinstall, keeping its config       |
| `plan-extensions`        | `node ${CLAUDE_SKILL_DIR}/scripts/plan-extensions.mjs [--wanted id=n,id=n] [--gitignore <path>]`   | Read-only extension and ignore plan |
| `inside-work-tree`       | `git rev-parse --is-inside-work-tree`                                                              | Prints `true` in a git repo         |
