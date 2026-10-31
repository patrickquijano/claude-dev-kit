# Ecosystems

Detect from tracked files; confirm each value against the options reference fetched in step 3 before writing it.

## Contents

- Map · Directories · Rules

## Map

| Tracked file (basename or glob)                                                | `package-ecosystem`                      |
| ------------------------------------------------------------------------------ | ---------------------------------------- |
| `package.json`                                                                 | `npm` (pnpm and Yarn lockfiles included) |
| `bun.lock`                                                                     | `bun`                                    |
| `composer.json`                                                                | `composer`                               |
| `Gemfile`                                                                      | `bundler`                                |
| `requirements*.txt`, `pyproject.toml`, `Pipfile`, `setup.py`                   | `pip`                                    |
| `uv.lock`                                                                      | `uv`                                     |
| `Cargo.toml`                                                                   | `cargo`                                  |
| `go.mod`                                                                       | `gomod`                                  |
| `pom.xml`                                                                      | `maven`                                  |
| `build.gradle`, `build.gradle.kts`                                             | `gradle`                                 |
| `*.csproj`, `*.fsproj`, `*.vbproj`, `Directory.Packages.props`                 | `nuget`                                  |
| `global.json`                                                                  | `dotnet-sdk`                             |
| `Dockerfile`, `Dockerfile.*`                                                   | `docker`                                 |
| `docker-compose*.yml`, `docker-compose*.yaml`, `compose*.yml`, `compose*.yaml` | `docker-compose`                         |
| `.github/workflows/*.yml`, `.github/workflows/*.yaml`, root `action.yml`       | `github-actions`                         |
| `devcontainer.json`                                                            | `devcontainers`                          |
| `*.tf`                                                                         | `terraform`                              |
| `.pre-commit-config.yaml`                                                      | `pre-commit`                             |
| `.gitmodules`                                                                  | `gitsubmodule`                           |
| `Chart.yaml`                                                                   | `helm`                                   |

A manifest type missing from the fetched reference is dropped and listed under `Open:`.

## Directories

- One entry per ecosystem; its `directories` list holds each directory containing a manifest (repo-relative, leading `/`).
- `github-actions` uses `/` (the reference scans `.github/workflows`); `devcontainers` uses `/`.
- Several directories → `directories`; one → `directory`. Globs only when the reference allows them.
- Ignore vendored and generated paths (`node_modules`, `vendor`, `bin`, `obj`, `dist`); `git ls-files` already skips untracked ones.

## Rules

- Never add an ecosystem without a tracked manifest.
- Never remove a user's existing entry for an ecosystem with no manifest; list it under `Open:`.
