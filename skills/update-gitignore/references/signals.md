# Signals

Read manifests and tool configs, then look for what they produce on disk. A candidate is `high` when the path exists untracked and a manifest or config confirms it; `medium` when only one of the two holds.

## Contents

- Categories · Evidence sources · Never ignore · Tracked secrets

## Categories

| Category     | Typical paths                                                              | Evidence                                                                        |
| ------------ | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Dependencies | `node_modules/`, `vendor/`, `.venv/`, `.pnpm-store/`, `Pods/`              | Lockfile or manifest tracked, directory untracked                               |
| Build output | `dist/`, `build/`, `target/`, `bin/`, `obj/`, `.next/`, `out/`             | Build script or tool config names it as output; directory untracked             |
| Caches       | `.cache/`, `__pycache__/`, `.pytest_cache/`, `.eslintcache`, `.turbo/`     | Tool config or file present untracked                                           |
| Test output  | `coverage/`, `htmlcov/`, `test-results/`, `playwright-report/`, `*.lcov`   | Test script or config names it; directory untracked                             |
| Logs         | `*.log`, `logs/`, `npm-debug.log*`                                         | Such files untracked                                                            |
| Secrets      | `.env`, `.env.*`, `*.pem`, `*.key`, `credentials.json`                     | File untracked; keep `!.env.example` style templates tracked with a `!` pattern |
| Local config | `*.local.*`, `.claude/settings.local.json`, `docker-compose.override.yml`  | File untracked and named local or override                                      |
| Editor / OS  | `.idea/`, `.vscode/*`, `*.swp`, `.DS_Store`, `Thumbs.db`                   | Present untracked; keep tracked `.vscode/` files with a `!` pattern             |
| Generated    | `*.tsbuildinfo`, `.terraform/`, `.vulnerability-reports/`, `*.generated.*` | Tool config or header comment marks it generated                                |

## Evidence sources

- Manifests: `package.json` (scripts, `files`, output flags), `composer.json`, `pyproject.toml`, `Cargo.toml`, `pom.xml`, `build.gradle*`, `*.csproj`, `go.mod`.
- Tool configs: `tsconfig*.json` (`outDir`), bundler and test configs (output and coverage dirs), `Dockerfile` and `docker-compose*.yml` (mounted data dirs), CI workflows (uploaded artifact paths).
- Disk: untracked paths that match a category pattern.

## Never ignore

- Lockfiles (`package-lock.json`, `composer.lock`, `Cargo.lock` in applications), unless the user asks.
- Files already tracked and intentionally committed (a library's `dist/`, vendored code); report them, do not ignore.
- Source, docs, and templates such as `.env.example`.

## Tracked secrets

A tracked file matching the Secrets category (`.env`, `.env.*` except templates, `*.pem`, `*.key`, `credentials.json`) is secret exposure. The analyst lists every such tracked file under `Tracked but ignored`, whether or not a candidate matches it.
