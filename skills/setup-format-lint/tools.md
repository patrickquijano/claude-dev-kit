# Tools

Catalog for `setup-format-lint`. The first candidate is the recommended one: the type's dedicated tool, else the most widely used option. Prettier is the dedicated formatter for web types (JS/TS, JSON, CSS, SCSS, Less, HTML, Markdown); for YAML, XML, and PHP it is the last formatter, a fallback when no dedicated one fits. For JS/TS, JSON, CSS/SCSS, HTML, Markdown, YAML, Dockerfile, PHP, C#, and XML, the cdk plugin's format-lint hooks (`hooks/scripts/tools.mjs`) run the installed tools they know, so Claude's edits get formatted and linted automatically.

## Candidates by file type

Format: file type (keys) — formatters — linters. `—` = no candidate; skip that role. A type gets one formatter and one or more linters.

- JavaScript/TypeScript (`js mjs cjs jsx ts mts cts tsx`) — Prettier — ESLint.
- JSON (`json jsonc`) — Prettier — ESLint with `@eslint/json`.
- CSS (`css`) — Prettier — Stylelint.
- SCSS (`scss`) — Prettier — Stylelint (SCSS config).
- Less (`less`) — Prettier — Stylelint (`postcss-less` syntax).
- HTML (`html htm`) — Prettier — HTMLHint.
- Markdown (`md markdown`) — Prettier — markdownlint-cli2.
- YAML (`yaml yml`) — yamlfmt | Prettier — yamllint.
- Dockerfile (`Dockerfile`, `Dockerfile.*` except `*.dockerignore`, `*.dockerfile`) — no formatter — hadolint.
- Shell (`sh bash`, and extensionless files whose first line is a `#!` line ending in `sh` or `bash`) — shfmt — ShellCheck.
- Python (`py`) — Ruff | Black — Ruff | Flake8.
- PHP (`php`) — Pint (first when `composer.json` requires `laravel/framework`) | PHP-CS-Fixer (first otherwise) | Prettier with `@prettier/plugin-php` (fallback; repos with `*.blade.php` files → not offered, the plugin cannot format mixed PHP/HTML) — PHPStan | PHP_CodeSniffer.
- C# (`cs`) — CSharpier — `dotnet format` (`style` and `analyzers`; ships with the .NET 6+ SDK).
- Go (`go`) — gofmt (ships with Go) — `go vet` (ships with Go).
- XML (`xml`) — xmlstarlet | xmllint | Prettier with `@prettier/plugin-xml` — xmllint. The format-lint hooks run Prettier (when configured for XML), then the first of xmlstarlet (`fo`) and xmllint (`--format`) found.

Not covered (list as `uncovered`): `.sass` (indented syntax; Prettier and Stylelint standard configs cannot parse it) and any type not listed.

## Install

Installed = npm package in `dependencies`/`devDependencies`, Composer package in `require-dev`, .NET tool in `.config/dotnet-tools.json`, or native binary found by `command -v`.

- npm dev dependencies: Prettier `prettier`, plus `@prettier/plugin-xml` when Prettier formats XML and `@prettier/plugin-php` when it formats PHP; ESLint `eslint @eslint/js globals`, plus `typescript-eslint` when TS files exist and `@eslint/json` when ESLint lints JSON; Stylelint `stylelint stylelint-config-standard`, plus `stylelint-config-standard-scss` when SCSS files exist and `postcss-less` when Less files exist; markdownlint-cli2 `markdownlint-cli2`; HTMLHint `htmlhint`.
- Composer dev (needs `composer.json` and `command -v composer`): Pint `laravel/pint`; PHP-CS-Fixer `friendsofphp/php-cs-fixer`; PHPStan `phpstan/phpstan`; PHP_CodeSniffer `squizlabs/php_codesniffer`.
- .NET local tool (needs `command -v dotnet`): `dotnet new tool-manifest` when `.config/dotnet-tools.json` is missing, then `dotnet tool install csharpier`. `dotnet format` ships with the SDK (no install); it needs a `*.sln` or `*.csproj` in the run dir, else skip it.
- Native tools: use the first channel whose command exists.
  - hadolint, shellcheck: `brew install <tool>`. No channel → skip and give the official install page.
  - yamlfmt: `brew install yamlfmt`, else `go install github.com/google/yamlfmt/cmd/yamlfmt@latest`.
  - shfmt: `brew install shfmt`, else `go install mvdan.cc/sh/v3/cmd/shfmt@latest`.
  - yamllint, Ruff, Black, Flake8: `uv tool install <pkg>`, else `pipx install <pkg>`, else `brew install <pkg>`.
  - gofmt, `go vet`: ship with Go; missing → skip.
  - xmlstarlet: `brew install xmlstarlet`; no channel → skip and give the official install page.
  - xmllint: ships with libxml2 (preinstalled on macOS); missing → skip and name the package (`libxml2-utils` on Debian/Ubuntu).

## Config files and defaults

Format: tool — config file — recommended defaults — check command. `<x>` = the exec form for installed binaries from `${CLAUDE_SKILL_DIR}/../setup-husky/package-manager.md` (`npx --no-install`, `pnpm exec`, `yarn`, `bunx --no-install`). Preference `.jsonc` > `.json` > `.yaml`. A tool that supports none of these uses its native format, as listed. Configured = any config file the tool reads already exists, including a `package.json` key. `none` = tool defaults are the recommendation; write no config and ask nothing.

- Prettier — `.prettierrc.json` (Prettier reads no `.jsonc`) — `{ "printWidth": 120, "singleQuote": true, "trailingComma": "none" }`, plus `"plugins"` with `@prettier/plugin-xml` when Prettier formats XML and `@prettier/plugin-php` when it formats PHP — `<x> prettier --check .`.
- ESLint — `eslint.config.mjs` (flat config is JavaScript only) — `defineConfig` with `@eslint/js` recommended on `**/*.{js,mjs,cjs}` and `globals` for the runtime (`globals.node`, `globals.browser`). TS files → add `tseslint.configs.recommended` from `typescript-eslint`. JSX files → `languageOptions.parserOptions.ecmaFeatures.jsx: true` on `**/*.jsx`. JSON linted → `import json from '@eslint/json'`, then `{ files: ['**/*.json'], ignores: ['package-lock.json'], plugins: { json }, language: 'json/json', extends: ['json/recommended'] }` and the same on `**/*.jsonc` with `language: 'json/jsonc'`. These sets have no stylistic rules, so ESLint does not conflict with Prettier — `<x> eslint .`.
- Stylelint — `.stylelintrc.json` — `{ "extends": ["stylelint-config-standard"] }`; SCSS files → also `"overrides": [{ "files": ["**/*.scss"], "extends": ["stylelint-config-standard-scss"] }]`; Less files → also an override `{ "files": ["**/*.less"], "customSyntax": "postcss-less" }` — `<x> stylelint "**/*.{css,scss,less}"` (only the extensions present).
- markdownlint-cli2 — `.markdownlint-cli2.jsonc` — `"config": { "default": true, "MD013": false, "MD024": false, "MD025": false, "MD031": false, "MD032": false, "MD033": false, "MD041": false }`, each rule commented with its name (line-length, no-duplicate-heading, single-h1, blanks-around-fences, blanks-around-lists, no-inline-html, first-line-h1) — `<x> markdownlint-cli2 "**/*.md"`.
- yamllint — `.yamllint.yaml` (YAML only) — `extends: default`, `rules: { line-length: { max: 120 } }` — `yamllint --strict .` (warnings fail, as in the format-lint Stop hook).
- yamlfmt — `.yamlfmt.yaml` (YAML only) — `formatter: { include_document_start: true, pad_line_comments: 2, retain_line_breaks: true, max_line_length: 120 }`. These match yamllint `default` (document-start, 2 spaces before comments), so the two tools agree — `yamlfmt -lint .`.
- hadolint — `.hadolint.yaml` (YAML only) — `ignored:` system package pins `DL3008` (apt-get), `DL3018` (apk), `DL3033` (yum), `DL3037` (zypper), `DL3041` (dnf); package-manager pins `DL3013` (pip), `DL3016` (npm), `DL3028` (gem), `DL3062` (go). hadolint has no Composer pin rule. Base image rules `DL3006` (untagged) and `DL3007` (`:latest`) stay on — `hadolint <Dockerfiles from step 2>`.
- ShellCheck — `.shellcheckrc` — none — `shellcheck <shell files from step 2>`.
- shfmt — `.editorconfig` — none — `shfmt -d <shell files>`.
- Ruff — `ruff.toml`, or `[tool.ruff]` in `pyproject.toml` — none — `ruff check .`.
- Black — `[tool.black]` in `pyproject.toml` — none — `black --check .`.
- Flake8 — `.flake8` — none — `flake8 .`.
- Pint — `pint.json` — `{ "preset": "laravel" }` — `vendor/bin/pint --test`.
- PHP-CS-Fixer — `.php-cs-fixer.dist.php` (PHP only) — `(new PhpCsFixer\Config())->setRules(['@PSR12' => true])->setFinder(PhpCsFixer\Finder::create()->in(__DIR__)->exclude('vendor'))` — `vendor/bin/php-cs-fixer fix --dry-run --diff`.
- PHPStan — `phpstan.neon.dist` (NEON only; PHPStan also reads `phpstan.neon`, `phpstan.dist.neon`) — `parameters: { level: 5, paths: [<dirs holding PHP files, for example src, app, tests>] }` — `vendor/bin/phpstan analyse --no-progress`.
- PHP_CodeSniffer — `phpcs.xml.dist` (XML only; phpcs also reads `.phpcs.xml`, `phpcs.xml`, `.phpcs.xml.dist`) — `<ruleset>` with `<file>` per PHP source dir, `<arg name="extensions" value="php"/>`, `<rule ref="PSR12"/>`, and `Generic.Files.LineLength` `lineLimit` 120 — `vendor/bin/phpcs`.
- CSharpier — `.csharpierrc.json` (CSharpier also reads `.csharpierrc`, `.csharpierrc.yaml`, `.editorconfig`) — `{ "printWidth": 120 }` — `dotnet csharpier check .` (also its lint step in the format-lint hooks).
- `dotnet format` — `.editorconfig` (`cdk:setup-editorconfig` owns it) — none — `dotnet format style --verify-no-changes`, `dotnet format analyzers --verify-no-changes`.
- HTMLHint — `.htmlhintrc` — none — `<x> htmlhint "**/*.{html,htm}"`.
- gofmt, `go vet` — no config — `gofmt -l .`, `go vet ./...`.
- xmlstarlet — no config — none (formatter only; xmllint checks).
- xmllint — no config — `xmllint --noout <XML files>`.

## Overlaps

Apply whatever each tool's config status is; append only missing entries.

- Prettier and yamlfmt both used → add `*.yaml` and `*.yml` to `.prettierignore`, so only yamlfmt formats YAML.
- Prettier used and another formatter chosen for XML or PHP → add `*.xml` or `*.php` to `.prettierignore`, and leave out its plugin, so one formatter owns each type.
- Pint and PHP_CodeSniffer both chosen → warn: phpcs `PSR12` sniffs flag Pint `laravel` preset output; recommend PHPStan, or a phpcs ruleset matching the preset.
- CSharpier and `dotnet format` both used → run only `dotnet format style` and `analyzers`, never bare `dotnet format` or `whitespace`, so CSharpier owns layout.

## Ignore paths

Syntax: the "Linters and formatters" list in `${CLAUDE_SKILL_DIR}/../setup-husky/ignores.md` (skip-when conditions included). Tools not listed there: Ruff `extend-exclude`, Black `extend-exclude` (regex), Flake8 `extend-exclude`, PHP-CS-Fixer `Finder->exclude()`, PHPStan `excludePaths.analyseAndScan`, PHP_CodeSniffer `<exclude-pattern>`, CSharpier `.csharpierignore`. HTMLHint has no ignore file: add `--ignore "<pattern>,…"` to its check command (it skips `**/node_modules/**` by default). `dotnet format` takes `--exclude <paths>` on its check commands. hadolint, ShellCheck, shfmt, gofmt, `go vet`, xmllint take explicit paths, so nothing to configure.

Candidate paths (offer only those that exist): build output, coverage, and vendored deps = the generated and dependency patterns of the detected stacks in `${CLAUDE_SKILL_DIR}/../setup-git/ignores.md` (for example `dist/`, `build/`, `.next/`, `coverage/`, `vendor/`, `.venv/`, `target/`), so both skills share one list. Tool-specific extras: `out/`, lockfiles (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lock`, `composer.lock`), generated hooks (`.husky/_/`). Every npm tool above skips `node_modules/` by default.
