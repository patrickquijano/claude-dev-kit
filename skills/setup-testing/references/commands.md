# Commands

| Name                 | Command                                | Purpose                                                                             |
| -------------------- | -------------------------------------- | ----------------------------------------------------------------------------------- |
| `repo-root`          | `git rev-parse --show-toplevel`        | Project root (preloaded in Context)                                                 |
| `list-files`         | `git ls-files`                         | List tracked files                                                                  |
| `git-dir`            | `git rev-parse --git-dir`              | Locate the git dir for the unsafe-state check                                       |
| `docker-info`        | `docker info`                          | Check Docker is available (container tests)                                         |
| `js-version`         | `npm view <pkg> version`               | Latest version for `<v>` in the JS `add-js-*` rows (any manager)                    |
| `smoke-<kind>`       | stacks.md Command column, run per kind | Smoke run of a configured suite (step 8), with the no-tests flag from flow.md Smoke |
| `playwright-install` | `<x> playwright install`               | Install Playwright browsers (`<x>` per stacks.md Package manager)                   |
| `add-js-npm`         | `npm install -D <pkg>@<v>`             | Add a JS dev dependency (npm)                                                       |
| `add-js-pnpm`        | `pnpm add -D <pkg>@<v>`                | Add a JS dev dependency (pnpm; `-w` at a workspace root)                            |
| `add-js-yarn`        | `yarn add -D <pkg>@<v>`                | Add a JS dev dependency (yarn; `-W` at a yarn 1 workspace root)                     |
| `add-js-bun`         | `bun add -d <pkg>@<v>`                 | Add a JS dev dependency (bun)                                                       |
| `add-py-uv`          | `uv add --dev <pkg>`                   | Add a Python dev dependency (`uv.lock`)                                             |
| `add-py-poetry`      | `poetry add --group dev <pkg>`         | Add a Python dev dependency (`poetry.lock`)                                         |
| `add-go`             | `go get <module>`                      | Add a Go test dependency                                                            |
| `add-rust`           | `cargo add --dev <crate>`              | Add a Rust dev dependency                                                           |
| `add-php`            | `composer require --dev <pkg>`         | Add a PHP dev dependency                                                            |
| `add-ruby`           | `bundle add <gem> --group test`        | Add a Ruby test gem                                                                 |
| `add-deno`           | `deno add npm:<pkg>`                   | Add a Deno dependency                                                               |
| `add-dotnet`         | `dotnet add <project> package <pkg>`   | Add a .NET test package                                                             |
