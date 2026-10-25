# Commands

| Name                  | Command                                                                                  | Purpose                                           |
| --------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------- |
| `git-root`            | `git rev-parse --show-toplevel`                                                          | Repository root (preloaded in Context)            |
| `pm-detect`           | `node ${CLAUDE_SKILL_DIR}/scripts/pm-detect.mjs --root <git root> [--cwd <dir>]`         | JSON: package dir, manager, missing-package name  |
| `list-files`          | `git ls-files --cached --others --exclude-standard`                                      | Tracked and untracked files for detect (fallback) |
| `runtime-probe`       | `node --version`, `php --version`, `dotnet --version`, `python3 --version`, `go version` | Runtime for engine checks (fallback)              |
| `npm-view`            | `npm view <pkg>[@<version>] <fields> --json`                                             | Resolve an npm version (fallback)                 |
| `registry-fetch`      | WebFetch of the PyPI, Packagist, NuGet, or Go proxy URL in `tools.md`                    | Resolve a non-npm version (fallback)              |
| `check-tool`          | The tool's check command from `configs.md`, `NO_COLOR=1`                                 | Check run for step 10 (fallback); asks permission |
| `tool-check`          | `command -v <tool>`                                                                      | Check a native binary or package manager exists   |
| `npm-view-exports`    | `npm view eslint@<version> exports --json`                                               | Check the resolved ESLint exports `./config`      |
| `npm-add-dev`         | `npm install -D <pkg>@<version> …`                                                       | Install npm dev packages (npm)                    |
| `pnpm-add-dev`        | `pnpm add -D <pkg>@<version> …`                                                          | Install npm dev packages (pnpm; `-w` at root)     |
| `yarn-add-dev`        | `yarn add -D <pkg>@<version> …`                                                          | Install npm dev packages (yarn; `-W` yarn 1)      |
| `bun-add-dev`         | `bun add -d <pkg>@<version> …`                                                           | Install npm dev packages (bun)                    |
| `brew-info`           | `brew info --json=v2 <formula>`                                                          | Verify a Homebrew formula and its version         |
| `composer-require`    | `composer require --dev <pkg>:^<version> …`                                              | Install Composer dev packages                     |
| `dotnet-manifest`     | `dotnet new tool-manifest`                                                               | Create `.config/dotnet-tools.json`                |
| `dotnet-tool-install` | `dotnet tool install <pkg> --version <version>`                                          | Install a .NET local tool                         |
| `uv-install`          | `uv tool install <pkg>==<version>`                                                       | Install a Python tool with uv                     |
| `pipx-install`        | `pipx install <pkg>==<version>`                                                          | Install a Python tool with pipx                   |
| `go-install`          | `go install <module>@<version>`                                                          | Install a Go tool                                 |
| `brew-install`        | `brew install <formula>`                                                                 | Install a verified Homebrew formula               |
