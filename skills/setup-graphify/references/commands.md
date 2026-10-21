# Commands

| Name                   | Command                             | Purpose                             |
| ---------------------- | ----------------------------------- | ----------------------------------- |
| `git-root`             | `git rev-parse --show-toplevel`     | Repo root (preloaded in Context)    |
| `has-graphify`         | `command -v graphify`               | Succeeds when installed             |
| `has-uv`               | `command -v uv`                     | Succeeds when uv exists             |
| `has-pipx`             | `command -v pipx`                   | Succeeds when pipx exists           |
| `install-uv`           | `uv tool install graphifyy==0.9.93` | Install graphify with uv            |
| `install-pipx`         | `pipx install graphifyy==0.9.93`    | Install graphify with pipx          |
| `version`              | `graphify --version`                | Installed version                   |
| `install-skill`        | `graphify install --project`        | Register the Claude skill           |
| `install-claude-hooks` | `graphify claude install --project` | Add Claude hooks, CLAUDE.md section |
| `hook-status`          | `graphify hook status`              | Git hook install state              |
| `install-git-hooks`    | `graphify hook install`             | Add git hooks, merge driver         |
| `label-missing`        | `graphify label . --missing-only`   | Name placeholder communities        |
