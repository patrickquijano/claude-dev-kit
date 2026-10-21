# Commands

| Name                  | Command                                         | Purpose                                         |
| --------------------- | ----------------------------------------------- | ----------------------------------------------- |
| `git-root`            | `git rev-parse --show-toplevel`                 | Repository root (preloaded in Context)          |
| `tool-check`          | `command -v <tool>`                             | Check a native binary or package manager exists |
| `brew-info`           | `brew info --json=v2 <formula>`                 | Verify a Homebrew formula and its version       |
| `composer-require`    | `composer require --dev <pkg>:^<version> …`     | Install Composer dev packages                   |
| `dotnet-manifest`     | `dotnet new tool-manifest`                      | Create `.config/dotnet-tools.json`              |
| `dotnet-tool-install` | `dotnet tool install <pkg> --version <version>` | Install a .NET local tool                       |
| `uv-install`          | `uv tool install <pkg>==<version>`              | Install a Python tool with uv                   |
| `pipx-install`        | `pipx install <pkg>==<version>`                 | Install a Python tool with pipx                 |
| `go-install`          | `go install <module>@<version>`                 | Install a Go tool                               |
| `brew-install`        | `brew install <formula>`                        | Install a verified Homebrew formula             |
