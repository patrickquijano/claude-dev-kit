# Package managers

Verified 2026-09-28 against each tool's `--help` or official docs. A row marked _verify_ was not confirmed; check the tool's docs before relying on it. Manager missing here → find its official docs, then add a row in step 10.

## Detect, list, upgrade

Format: manager — detect files — list outdated (read-only) — upgrade one package (updates manifest + lockfile) — notes.

- npm — `package.json` + `package-lock.json` — `npm outdated --json` (Current/Wanted/Latest) — `npm install <pkg>@<version>` — a major bump needs the explicit version or `@latest`. <https://docs.npmjs.com/cli/commands/npm-outdated>
- pnpm — `package.json` + `pnpm-lock.yaml` — `pnpm outdated --format json` — `pnpm add <pkg>@<version>` — `pnpm update --latest <pkg>` rewrites the range. <https://pnpm.io/cli/outdated>
- Yarn 1 — `yarn.lock`, no `.yarnrc.yml` — `yarn outdated --json` (JSON lines) — `yarn upgrade <pkg>@<version>` (_verify_ it updates `package.json`) — <https://classic.yarnpkg.com/en/docs/cli/outdated>
- Yarn 2+ — `yarn.lock` + `.yarnrc.yml` — no outdated command; use the registry lookup below — `yarn up <pkg>@<version>` — <https://yarnpkg.com/cli/up>
- Bun — `bun.lock` (older `bun.lockb`) — `bun outdated` (no JSON) — `bun add <pkg>@<version>` — <https://bun.com/docs/cli/outdated>
- Composer — `composer.json` + `composer.lock` — `composer outdated --direct --format=json` — `composer require <vendor/pkg>:^<version> -W` — a major bump needs a new constraint. <https://getcomposer.org/doc/03-cli.md>
- pip — `requirements*.txt`, no lockfile — `pip list --outdated --format=json` — set `<pkg>==<version>` in the requirements file, then `pip install -r <file>` — no lockfile, so the requirements file is edited directly. <https://pip.pypa.io/en/stable/cli/pip_list/>
- uv — `pyproject.toml` + `uv.lock` — `uv tree --outdated` — `uv add "<pkg>>=<version>"` — `uv lock --upgrade-package <pkg>` stays within the existing constraint. <https://docs.astral.sh/uv/reference/cli/>
- Poetry — `pyproject.toml` + `poetry.lock` — `poetry show --outdated --top-level --format json` — `poetry add <pkg>@^<version>` — `poetry update` never edits `pyproject.toml`. <https://python-poetry.org/docs/cli/>
- Bundler — `Gemfile` + `Gemfile.lock` — `bundle outdated --parseable` — set the `Gemfile` constraint, then `bundle update --conservative <gem>` — <https://bundler.io/man/bundle-outdated.1.html>
- Cargo — `Cargo.toml` + `Cargo.lock` — no stable outdated command; `cargo update --dry-run` shows compatible updates, registry lookup for the rest — `cargo add <crate>@<version>` — `cargo outdated` and `cargo upgrade` are third-party; use only when installed. <https://doc.rust-lang.org/cargo/commands/>
- Go — `go.mod` + `go.sum` — `go list -m -u -json all` (`Update` field; drop entries with `"Indirect": true`) — `go get <module>@<version>`, then `go mod tidy` — `Update` stays within the major version. A major version is a new module path (`/v2`): probe `https://proxy.golang.org/<module>/v<N+1>/@latest`; upgrading means changing every import. <https://go.dev/ref/mod>
- .NET — `*.csproj` or `Directory.Packages.props` — `dotnet list package --outdated --format json` — `dotnet add package <id> --version <version>` — central package management: edit the version in `Directory.Packages.props`. <https://learn.microsoft.com/dotnet/core/tools/dotnet-list-package>
- Maven — `pom.xml` — `mvn versions:display-dependency-updates` (text) — `mvn versions:use-dep-version -Dincludes=<group>:<artifact> -DdepVersion=<version>` — snapshots excluded by default. <https://www.mojohaus.org/versions/versions-maven-plugin/>
- Gradle — `build.gradle(.kts)`, `gradle/libs.versions.toml` — no built-in command; registry lookup (the ben-manes versions plugin is third-party; use only when applied) — edit the version catalog or build file; lockfiles: `--update-locks <group>:<artifact>` — <https://docs.gradle.org/current/userguide/dependency_versions.html>
- Dart / Flutter — `pubspec.yaml` + `pubspec.lock` — `dart pub outdated --json` — `dart pub add <pkg>:^<version>` — <https://dart.dev/tools/pub/cmd/pub-outdated>
- Swift PM — `Package.swift` + `Package.resolved` — `swift package update --dry-run` — edit `Package.swift`, then `swift package update <pkg>` — <https://www.swift.org/documentation/package-manager/>
- Mix — `mix.exs` + `mix.lock` — `mix hex.outdated` — edit `mix.exs`, then `mix deps.update <pkg>` — <https://hexdocs.pm/hex/Mix.Tasks.Hex.Outdated.html>

## Latest stable version

Registry lookup over HTTP (WebFetch or `curl -s`). Skip versions with a pre-release suffix (`-alpha`, `-beta`, `-rc`, `.dev`, `a1`, `b1`, `rc1`).

- npm — `https://registry.npmjs.org/<pkg>/latest` → `version`
- PyPI — `https://pypi.org/pypi/<pkg>/json` → `info.version` (check it has no pre-release suffix)
- Packagist — `https://repo.packagist.org/p2/<vendor>/<pkg>.json` → first stable `packages["<vendor>/<pkg>"][].version`
- crates.io — `https://crates.io/api/v1/crates/<crate>` → `crate.max_stable_version` (send a `User-Agent` header)
- Go — `https://proxy.golang.org/<module>/@latest` → `Version` (module path case-encoded: uppercase → `!` + lowercase)
- NuGet — `https://api.nuget.org/v3-flatcontainer/<id lowercase>/index.json` → last `versions[]` entry without `-`
- Maven Central — `https://repo1.maven.org/maven2/<group as path>/<artifact>/maven-metadata.xml` → `<release>` (the search API can be stale)
- RubyGems — `https://rubygems.org/api/v1/versions/<gem>/latest.json` → `version`
- Hex — `https://hex.pm/api/packages/<pkg>` → `latest_stable_version`
- pub.dev — `https://pub.dev/api/packages/<pkg>` → `latest.version`
