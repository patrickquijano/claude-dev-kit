# Commands

| Name            | Command                         | Purpose                 |
| --------------- | ------------------------------- | ----------------------- |
| `repo-root`     | `git rev-parse --show-toplevel` | Repository root         |
| `os-env`        | `printenv OS`                   | `Windows_NT` on Windows |
| `uname`         | `uname`                         | `Darwin` or `Linux`     |
| `config-dir`    | `printenv CLAUDE_CONFIG_DIR`    | Settings dir when set   |
| `mcp-list`      | `claude mcp list`               | Configured MCP servers  |
| `validate-json` | `jq empty <file>`               | JSON syntax check       |
