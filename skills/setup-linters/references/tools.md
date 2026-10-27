# Tools

## Contents

- Candidates by file type · Versions · Install

Linter catalog; configs are in `configs.md`, formatter conflicts in `formatter-conflicts.md`. The first candidate is the recommended one: the type's dedicated tool, else the most widely used option. Toolchain tools (`go vet`, Clippy) fill a role only when they are its only candidate.

## Candidates by file type

Format: file type (keys) — linters. `—` = no linter; skip the type. A type gets one or more linters.

- JavaScript/TypeScript (`js mjs cjs jsx ts mts cts tsx`) — ESLint.
- JSON (`json jsonc`) — ESLint with `@eslint/json`.
- CSS (`css`) — Stylelint.
- SCSS (`scss`) — Stylelint (SCSS config).
- Less (`less`) — Stylelint (`postcss-less` syntax).
- HTML (`html htm`) — HTMLHint.
- Markdown (`md markdown`) — markdownlint-cli2.
- YAML (`yaml yml`) — yamllint.
- Dockerfile (`Dockerfile`, `Dockerfile.*` except `*.dockerignore`, `*.dockerfile`) — hadolint.
- Shell (`sh bash`, and extensionless files whose first line is a `#!` line ending in `sh` or `bash`) — ShellCheck.
- Bats (`bats`, and extensionless files whose first line is a `#!` line ending in `bats`) — ShellCheck. The files join the shell file list of the detect step.
- Python (`py`) — Ruff | Flake8, plus mypy as an optional extra linter.
- PHP (`php`) — PHPStan | PHP_CodeSniffer.
- C# (`cs`) — `dotnet format` (`style` and `analyzers`; ships with the .NET 6+ SDK).
- Go (`go`) — `go vet` (ships with Go).
- TOML (`toml`) — Taplo (`taplo check`).
- GitHub Actions (`.github/workflows/*.yml`, `*.yaml`) — actionlint, on top of yamllint.
- SQL (`sql`) — SQLFluff.
- Terraform (`tf tfvars`) — TFLint.
- Rust (`rs`) — Clippy (ships with the Rust toolchain).
- Ruby (`rb`, `Gemfile`, `Rakefile`, `*.gemspec`) — RuboCop.
- Java (`java`) — Checkstyle (`google_checks.xml`).
- Kotlin (`kt kts`) — ktlint.
- Swift (`swift`) — SwiftLint.
- Vue (`vue`) — ESLint with `eslint-plugin-vue`.
- Svelte (`svelte`) — ESLint with `eslint-plugin-svelte`.
- C/C++ (`c h cc cpp cxx hh hpp`) — clang-tidy (needs `compile_commands.json`, else skipped and listed in `Open:`).
- Lua (`lua`) — Luacheck.
- XML (`xml`) — xmllint.

A file type not listed (including `.sass`, whose indented syntax Stylelint standard configs cannot parse) → ask the user for a linter name; a name the user gives is verified with the version step before any install.

## Versions

Never pin or remember versions in this skill. Before any install or config write, the version resolver (step 6) resolves the newest stable version of every package or formula to install from its authoritative source: npm registry (`npm view`), PyPI JSON API, Packagist, NuGet (flat container plus registration index), Go module proxy, Homebrew (`brew info --json=v2`). Registry URLs: PyPI `https://pypi.org/pypi/<pkg>/json` (`info.version`, `info.yanked`, `info.requires_python`); Packagist `https://repo.packagist.org/p2/<vendor>/<package>.json` (highest stable, skip abandoned, `require.php`); NuGet flat container `https://api.nuget.org/v3-flatcontainer/<lowercase id>/index.json` (highest version without a `-` suffix); Go proxy `https://proxy.golang.org/<module>/@v/list` (highest version without a `-` suffix; `…/@v/<version>.mod` for the `go` directive). Exclude pre-release, preview, alpha, beta, rc, nightly, deprecated, yanked, unlisted, and incompatible versions (peer ranges, `engines`, `require.php`, `requires_python`, `go` directive vs the detected runtime). A version that cannot be verified → skip that tool with the reason; never fall back to a remembered version.

Retained constraints (each applied only when the check fails; report under `Constraints`):

- Companion peer ranges: a plugin or config package (`typescript-eslint`, `@eslint/json`, `eslint-plugin-vue`, `eslint-plugin-svelte`, `eslint-config-prettier`, `stylelint-config-standard`, `stylelint-config-standard-scss`, `postcss-less`) must admit the resolved core (`eslint`, `stylelint`) in its `peerDependencies`. Reason: an out-of-range peer breaks install or loading. Resolve the core first, then pick the newest companion admitting it; none → lower the core to the newest version every companion admits.
- `typescript-eslint` also needs `typescript` (its peer): install it too when absent, resolved the same way.
- ESLint: the written `eslint.config.mjs` imports `defineConfig` from `eslint/config`, so the resolved ESLint must export `./config` (`npm-view-exports`). Reason: older releases lack it. Missing → skip ESLint.
- Native and runtime tools resolve against the detected runtime (Node for npm, PHP for Composer, Python for PyPI, Go for modules). Reason: a version whose declared minimum exceeds the installed runtime fails at run time.

Install forms with the resolved version `<v>`:

- npm: `<pkg>@<v>` (the manager saves a caret range).
- Composer: `<pkg>:^<v>`.
- uv: `uv tool install <pkg>==<v>`; pipx: `pipx install <pkg>==<v>`.
- Go: `go install <module>@<v>` (the resolved explicit version, never an alias).
- Homebrew: no version pin; `brew install <formula>` after the formula is verified (`versions.stable`, not deprecated or disabled).

## Install

Installed = npm package in `dependencies`/`devDependencies`, Composer package in `require-dev`, or native binary found by `command -v`. Every install uses the version from the Versions step.

- npm dev dependencies: ESLint `eslint @eslint/js globals`, plus `typescript-eslint` and `typescript` (when absent) when TS files exist and `@eslint/json` when ESLint lints JSON; ESLint for Vue adds `eslint-plugin-vue`, for Svelte `eslint-plugin-svelte svelte`, and `eslint-config-prettier` when a Prettier config is present (`formatter-conflicts.md`); Stylelint `stylelint stylelint-config-standard`, plus `stylelint-config-standard-scss` when SCSS files exist and `postcss-less` when Less files exist; markdownlint-cli2 `markdownlint-cli2`; HTMLHint `htmlhint`; Taplo `@taplo/cli`.
- Composer dev (needs `composer.json` and `command -v composer`): PHPStan `phpstan/phpstan`; PHP_CodeSniffer `squizlabs/php_codesniffer`.
- `dotnet format` ships with the SDK (no install, no version); it needs a `*.sln` or `*.csproj` in the run dir, else skip it.
- Native tools: use the first channel whose command exists.
  - hadolint, shellcheck: `brew install <tool>`. No channel → skip and give the official install page.
  - yamllint, Ruff, Flake8: `uv tool install <pkg>==<v>`, else `pipx install <pkg>==<v>`, else `brew install <pkg>`.
  - `go vet`: ships with Go; missing → skip.
  - Clippy: ships with the Rust toolchain; missing → skip and list `rustup component add clippy` in `Open:`; never run it.
  - Taplo: npm `@taplo/cli` as a dev dependency, else `brew install taplo`.
  - actionlint: `brew install actionlint`, else `go install github.com/rhysd/actionlint/cmd/actionlint@<v>`.
  - SQLFluff, mypy: `uv tool install <pkg>==<v>`, else `pipx install <pkg>==<v>` (packages `sqlfluff`, `mypy`).
  - TFLint: `go install github.com/terraform-linters/tflint@<v>`, else `brew install tflint` only when `brew info --json=v2 tflint` verifies the formula.
  - RuboCop, Checkstyle, ktlint, SwiftLint, Luacheck: `brew install <formula>` (`rubocop`, `checkstyle`, `ktlint`, `swiftlint`, `luacheck`). No channel → skip and give the official install page.
  - clang-tidy: `brew install llvm` (keg-only: call it as `$(brew --prefix llvm)/bin/clang-tidy`).
  - xmllint: ships with libxml2 (preinstalled on macOS); missing → skip and name the package (`libxml2-utils` on Debian/Ubuntu).
