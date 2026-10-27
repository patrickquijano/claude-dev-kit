# Tools

## Contents

- Candidates by file type · Versions · Install

Formatter catalog; configs and overlaps are in `configs.md`. The first candidate is the recommended one: the type's dedicated tool, else the most widely used option. Prettier is the dedicated formatter for web types (JS/TS, JSON, CSS, SCSS, Less, HTML); for YAML, XML, and PHP it is the last formatter, a fallback when no dedicated one fits.

## Candidates by file type

Format: file type (keys) — formatters. `—` = no formatter; skip the type. A type gets one formatter. Toolchain tools (gofmt, `terraform fmt`, rustfmt) fill the role only when they are its only candidate.

- JavaScript/TypeScript (`js mjs cjs jsx ts mts cts tsx`) — Prettier.
- JSON (`json jsonc`) — Prettier.
- CSS (`css`) — Prettier.
- SCSS (`scss`) — Prettier.
- Less (`less`) — Prettier.
- HTML (`html htm`) — Prettier.
- Markdown (`md markdown`) — no formatter.
- YAML (`yaml yml`) — yamlfmt | Prettier.
- Dockerfile (`Dockerfile`, `Dockerfile.*` except `*.dockerignore`, `*.dockerfile`) — no formatter.
- Shell (`sh bash`, and extensionless files whose first line is a `#!` line ending in `sh` or `bash`) — shfmt.
- Bats (`bats`, and extensionless files whose first line is a `#!` line ending in `bats`) — shfmt (`-ln bats`). The files join the shell file list of the detect step.
- Python (`py`) — Ruff | Black.
- PHP (`php`) — Pint (first when `composer.json` requires `laravel/framework`) | PHP-CS-Fixer (first otherwise) | Prettier with `@prettier/plugin-php` (fallback; repos with `*.blade.php` files → not offered, the plugin cannot format mixed PHP/HTML).
- C# (`cs`) — CSharpier.
- Go (`go`) — gofmt (ships with Go).
- TOML (`toml`) — Taplo.
- GitHub Actions (`.github/workflows/*.yml`, `*.yaml`) — the YAML formatter.
- SQL (`sql`) — SQLFluff.
- Terraform (`tf tfvars`) — `terraform fmt` (ships with Terraform).
- Rust (`rs`) — rustfmt (ships with the Rust toolchain).
- Ruby (`rb`, `Gemfile`, `Rakefile`, `*.gemspec`) — no formatter (RuboCop autocorrect is a linter fix mode, not set up here).
- Java (`java`) — google-java-format.
- Kotlin (`kt kts`) — ktlint (format mode).
- Swift (`swift`) — SwiftFormat.
- Vue (`vue`) — Prettier.
- Svelte (`svelte`) — Prettier with `prettier-plugin-svelte`.
- C/C++ (`c h cc cpp cxx hh hpp`) — clang-format.
- Lua (`lua`) — StyLua.
- XML (`xml`) — xmlstarlet | xmllint | Prettier with `@prettier/plugin-xml`. Format with Prettier when configured for XML, else the first of xmlstarlet (`fo`) and xmllint (`--format`) found.

A file type not listed (including `.sass`, whose indented syntax Prettier cannot parse) → ask the user for a formatter name; a name the user gives is verified with the version step before any install.

## Versions

Never pin or remember versions in this skill. Before any install or config write, the version resolver (step 5) resolves the newest stable version of every package or formula to install from its authoritative source: npm registry (`npm view`), PyPI JSON API, Packagist, NuGet (flat container plus registration index), Go module proxy, Homebrew (`brew info --json=v2`). Registry URLs: PyPI `https://pypi.org/pypi/<pkg>/json` (`info.version`, `info.yanked`, `info.requires_python`); Packagist `https://repo.packagist.org/p2/<vendor>/<package>.json` (highest stable, skip abandoned, `require.php`); NuGet flat container `https://api.nuget.org/v3-flatcontainer/<lowercase id>/index.json` (highest version without a `-` suffix); Go proxy `https://proxy.golang.org/<module>/@v/list` (highest version without a `-` suffix; `…/@v/<version>.mod` for the `go` directive). Exclude pre-release, preview, alpha, beta, rc, nightly, deprecated, yanked, unlisted, and incompatible versions (peer ranges, `engines`, `require.php`, `requires_python`, `go` directive vs the detected runtime). A version that cannot be verified → skip that tool with the reason; never fall back to a remembered version.

Retained constraints (each applied only when the check fails; report under `Constraints`):

- Companion peer ranges: a Prettier plugin (`@prettier/plugin-xml`, `@prettier/plugin-php`, `prettier-plugin-svelte`) must admit the resolved `prettier` in its `peerDependencies`. Reason: an out-of-range peer breaks loading. Resolve `prettier` first, then pick the newest plugin admitting it; none → lower `prettier` to the newest version every plugin admits.
- Native and runtime tools resolve against the detected runtime (Node for npm, PHP for Composer, Python for PyPI, Go for modules). Reason: a version whose declared minimum exceeds the installed runtime fails at run time.

Install forms with the resolved version `<v>`:

- npm: `<pkg>@<v>` (the manager saves a caret range).
- Composer: `<pkg>:^<v>`.
- .NET local tool: `dotnet tool install <pkg> --version <v>`.
- uv: `uv tool install <pkg>==<v>`; pipx: `pipx install <pkg>==<v>`.
- Go: `go install <module>@<v>` (the resolved explicit version, never an alias).
- Homebrew: no version pin; `brew install <formula>` after the formula is verified (`versions.stable`, not deprecated or disabled).

## Install

Installed = npm package in `dependencies`/`devDependencies`, Composer package in `require-dev`, .NET tool in `.config/dotnet-tools.json`, or native binary found by `command -v`. Every install uses the version from the Versions step.

- npm dev dependencies: Prettier `prettier`, plus `@prettier/plugin-xml` when Prettier formats XML, `@prettier/plugin-php` when it formats PHP, and `prettier-plugin-svelte` when it formats Svelte; Taplo `@taplo/cli`.
- Composer dev (needs `composer.json` and `command -v composer`): Pint `laravel/pint`; PHP-CS-Fixer `friendsofphp/php-cs-fixer`.
- .NET local tool (needs `command -v dotnet`): `dotnet new tool-manifest` when `.config/dotnet-tools.json` is missing, then `dotnet tool install csharpier --version <v>`.
- Native tools: use the first channel whose command exists.
  - yamlfmt: `brew install yamlfmt`, else `go install github.com/google/yamlfmt/cmd/yamlfmt@<v>`.
  - shfmt: `brew install shfmt`, else `go install mvdan.cc/sh/v3/cmd/shfmt@<v>`.
  - Ruff, Black: `uv tool install <pkg>==<v>`, else `pipx install <pkg>==<v>`, else `brew install <pkg>`.
  - gofmt: ships with Go; missing → skip.
  - `terraform fmt`, rustfmt: ship with their toolchain; missing → skip, and list `rustup component add rustfmt` (Rust) or the Terraform install page in `Open:`; never run it.
  - Taplo: npm `@taplo/cli` as a dev dependency, else `brew install taplo`.
  - SQLFluff: `uv tool install sqlfluff==<v>`, else `pipx install sqlfluff==<v>`.
  - google-java-format, ktlint, SwiftFormat, StyLua: `brew install <formula>` (`google-java-format`, `ktlint`, `swiftformat`, `stylua`). No channel → skip and give the official install page.
  - clang-format: `brew install clang-format`.
  - xmlstarlet: `brew install xmlstarlet`; no channel → skip and give the official install page.
  - xmllint: ships with libxml2 (preinstalled on macOS); missing → skip and name the package (`libxml2-utils` on Debian/Ubuntu).
