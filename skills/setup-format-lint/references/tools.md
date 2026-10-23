# Tools

## Contents

- Candidates by file type · Versions · Install

Catalog for `setup-format-lint`; configs and overlaps are in `configs.md`. The first candidate is the recommended one: the type's dedicated tool, else the most widely used option. Prettier is the dedicated formatter for web types (JS/TS, JSON, CSS, SCSS, Less, HTML); for YAML, XML, and PHP it is the last formatter, a fallback when no dedicated one fits.

## Candidates by file type

Format: file type (keys) — formatters — linters. `—` = no candidate; skip that role. A type gets one formatter and one or more linters. Toolchain tools (gofmt, `go vet`, `terraform fmt`, rustfmt, Clippy) fill a role only when they are its only candidate.

- JavaScript/TypeScript (`js mjs cjs jsx ts mts cts tsx`) — Prettier — ESLint.
- JSON (`json jsonc`) — Prettier — ESLint with `@eslint/json`.
- CSS (`css`) — Prettier — Stylelint.
- SCSS (`scss`) — Prettier — Stylelint (SCSS config).
- Less (`less`) — Prettier — Stylelint (`postcss-less` syntax).
- HTML (`html htm`) — Prettier — HTMLHint.
- Markdown (`md markdown`) — no formatter — markdownlint-cli2 (also fixes with `--fix`; Prettier does not format Markdown, so files can end without a final newline).
- YAML (`yaml yml`) — yamlfmt | Prettier — yamllint.
- Dockerfile (`Dockerfile`, `Dockerfile.*` except `*.dockerignore`, `*.dockerfile`) — no formatter — hadolint.
- Shell (`sh bash`, and extensionless files whose first line is a `#!` line ending in `sh` or `bash`) — shfmt — ShellCheck.
- Bats (`bats`, and extensionless files whose first line is a `#!` line ending in `bats`) — shfmt (`-ln bats`) — ShellCheck. The files join the shell file list of the detect step.
- Python (`py`) — Ruff | Black — Ruff | Flake8, plus mypy as an optional extra linter.
- PHP (`php`) — Pint (first when `composer.json` requires `laravel/framework`) | PHP-CS-Fixer (first otherwise) | Prettier with `@prettier/plugin-php` (fallback; repos with `*.blade.php` files → not offered, the plugin cannot format mixed PHP/HTML) — PHPStan | PHP_CodeSniffer.
- C# (`cs`) — CSharpier — `dotnet format` (`style` and `analyzers`; ships with the .NET 6+ SDK).
- Go (`go`) — gofmt (ships with Go) — `go vet` (ships with Go).
- TOML (`toml`) — Taplo — Taplo (`taplo check`).
- GitHub Actions (`.github/workflows/*.yml`, `*.yaml`) — the YAML formatter — actionlint, on top of yamllint.
- SQL (`sql`) — SQLFluff — SQLFluff.
- Terraform (`tf tfvars`) — `terraform fmt` (ships with Terraform) — TFLint.
- Rust (`rs`) — rustfmt (ships with the Rust toolchain) — Clippy (ships with the Rust toolchain).
- Ruby (`rb`, `Gemfile`, `Rakefile`, `*.gemspec`) — RuboCop — RuboCop.
- Java (`java`) — google-java-format — Checkstyle (`google_checks.xml`, matching google-java-format).
- Kotlin (`kt kts`) — ktlint — ktlint.
- Swift (`swift`) — SwiftFormat — SwiftLint.
- Vue (`vue`) — Prettier — ESLint with `eslint-plugin-vue` and `eslint-config-prettier`.
- Svelte (`svelte`) — Prettier with `prettier-plugin-svelte` — ESLint with `eslint-plugin-svelte` (its `prettier` config).
- C/C++ (`c h cc cpp cxx hh hpp`) — clang-format — clang-tidy (needs `compile_commands.json`, else skipped and listed in `Open:`).
- Lua (`lua`) — StyLua — Luacheck.
- XML (`xml`) — xmlstarlet | xmllint | Prettier with `@prettier/plugin-xml` — xmllint. Format with Prettier when configured for XML, else the first of xmlstarlet (`fo`) and xmllint (`--format`) found.

Not covered (list as `uncovered`): `.sass` (indented syntax; Prettier and Stylelint standard configs cannot parse it) and any type not listed.

## Versions

Never pin or remember versions in this skill. Before any install or config write, `cdk:version-resolver` (`kind: packages`) resolves the newest stable version of every package or formula to install from its authoritative source: npm registry (`npm view`), PyPI JSON API, Packagist, NuGet (flat container plus registration index), Go module proxy, Homebrew (`brew info --json=v2`). Exclude pre-release, preview, alpha, beta, rc, nightly, deprecated, yanked, unlisted, and incompatible versions (peer ranges, `engines`, `require.php`, `requires_python`, `go` directive vs the detected runtime). A version that cannot be verified → skip that tool with the reason; never fall back to a remembered version.

Retained constraints (each applied only when the check fails; report under `Constraints`):

- Companion peer ranges: a plugin or config package (`typescript-eslint`, `@eslint/json`, `@prettier/plugin-xml`, `@prettier/plugin-php`, `stylelint-config-standard`, `stylelint-config-standard-scss`, `postcss-less`) must admit the resolved core (`eslint`, `prettier`, `stylelint`) in its `peerDependencies`. Reason: an out-of-range peer breaks install or loading. Resolve the core first, then pick the newest companion admitting it; none → lower the core to the newest version every companion admits.
- `typescript-eslint` also needs `typescript` (its peer): install it too when absent, resolved the same way.
- ESLint: the written `eslint.config.mjs` imports `defineConfig` from `eslint/config`, so the resolved ESLint must export `./config` (`npm view eslint@<version> exports --json`). Reason: older releases lack it. Missing → skip ESLint.
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

- npm dev dependencies: Prettier `prettier`, plus `@prettier/plugin-xml` when Prettier formats XML, `@prettier/plugin-php` when it formats PHP, and `prettier-plugin-svelte` when it formats Svelte; Taplo `@taplo/cli`; ESLint for Vue adds `eslint-plugin-vue eslint-config-prettier`, for Svelte `eslint-plugin-svelte eslint-config-prettier svelte`; ESLint `eslint @eslint/js globals`, plus `typescript-eslint` and `typescript` (when absent) when TS files exist and `@eslint/json` when ESLint lints JSON; Stylelint `stylelint stylelint-config-standard`, plus `stylelint-config-standard-scss` when SCSS files exist and `postcss-less` when Less files exist; markdownlint-cli2 `markdownlint-cli2`; HTMLHint `htmlhint`.
- Composer dev (needs `composer.json` and `command -v composer`): Pint `laravel/pint`; PHP-CS-Fixer `friendsofphp/php-cs-fixer`; PHPStan `phpstan/phpstan`; PHP_CodeSniffer `squizlabs/php_codesniffer`.
- .NET local tool (needs `command -v dotnet`): `dotnet new tool-manifest` when `.config/dotnet-tools.json` is missing, then `dotnet tool install csharpier --version <v>`. `dotnet format` ships with the SDK (no install, no version); it needs a `*.sln` or `*.csproj` in the run dir, else skip it.
- Native tools: use the first channel whose command exists.
  - hadolint, shellcheck: `brew install <tool>`. No channel → skip and give the official install page.
  - yamlfmt: `brew install yamlfmt`, else `go install github.com/google/yamlfmt/cmd/yamlfmt@<v>`.
  - shfmt: `brew install shfmt`, else `go install mvdan.cc/sh/v3/cmd/shfmt@<v>`.
  - yamllint, Ruff, Black, Flake8: `uv tool install <pkg>==<v>`, else `pipx install <pkg>==<v>`, else `brew install <pkg>`.
  - gofmt, `go vet`: ship with Go; missing → skip.
  - `terraform fmt`, rustfmt, Clippy: ship with their toolchain; missing → skip, and list `rustup component add rustfmt clippy` (Rust) or the Terraform install page in `Open:`; never run it.
  - Taplo: npm `@taplo/cli` as a dev dependency, else `brew install taplo`.
  - actionlint: `brew install actionlint`, else `go install github.com/rhysd/actionlint/cmd/actionlint@<v>`.
  - SQLFluff, mypy: `uv tool install <pkg>==<v>`, else `pipx install <pkg>==<v>` (packages `sqlfluff`, `mypy`).
  - TFLint: `go install github.com/terraform-linters/tflint@<v>`, else `brew install tflint` only when `brew info --json=v2 tflint` verifies the formula.
  - RuboCop, google-java-format, Checkstyle, ktlint, SwiftFormat, SwiftLint, StyLua, Luacheck: `brew install <formula>` (`rubocop`, `google-java-format`, `checkstyle`, `ktlint`, `swiftformat`, `swiftlint`, `stylua`, `luacheck`). No channel → skip and give the official install page.
  - clang-format: `brew install clang-format`. clang-tidy: `brew install llvm` (keg-only: call it as `$(brew --prefix llvm)/bin/clang-tidy`).
  - xmlstarlet: `brew install xmlstarlet`; no channel → skip and give the official install page.
  - xmllint: ships with libxml2 (preinstalled on macOS); missing → skip and name the package (`libxml2-utils` on Debian/Ubuntu).
