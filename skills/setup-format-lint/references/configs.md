# Configs

## Contents

- Config files and defaults · Overlaps · YAML alignment

## Config files and defaults

Format: tool — config file — recommended defaults — check command. `<x>` = the exec form for installed binaries from `package-manager.md` (`npx --no-install`, `pnpm exec`, `yarn`, `bunx --no-install`). Preference `.jsonc` > `.json` > `.yaml`. A tool that supports none of these uses its native format, as listed. Configured = any config file the tool reads already exists, including a `package.json` key. `none` = tool defaults are the recommendation; write no config and ask nothing. Write only keys whose value differs from the tool's default: a key that restates a default is dropped (checked against each tool's docs).

- Prettier — `.prettierrc.json` (Prettier reads no `.jsonc`) — `{ "printWidth": 120, "singleQuote": true, "trailingComma": "none" }`, plus `"plugins"` with `@prettier/plugin-xml` when Prettier formats XML and `@prettier/plugin-php` when it formats PHP — `<x> prettier --check .`.
- ESLint — `eslint.config.mjs` (flat config is JavaScript only) — `defineConfig` with `@eslint/js` recommended on `**/*.{js,mjs,cjs}` and `globals` for the runtime (`globals.node`, `globals.browser`). TS files → add `tseslint.configs.recommended` from `typescript-eslint`. JSX files → `languageOptions.parserOptions.ecmaFeatures.jsx: true` on `**/*.jsx`. JSON linted → `import json from '@eslint/json'`, then `{ files: ['**/*.json'], ignores: ['package-lock.json'], plugins: { json }, language: 'json/json', extends: ['json/recommended'] }` and the same on `**/*.jsonc` with `language: 'json/jsonc'`. These sets have no stylistic rules, so ESLint does not conflict with Prettier — `<x> eslint .`.
- Stylelint — `.stylelintrc.json` — `{ "extends": ["stylelint-config-standard"] }`; SCSS files → also `"overrides": [{ "files": ["**/*.scss"], "extends": ["stylelint-config-standard-scss"] }]`; Less files → also an override `{ "files": ["**/*.less"], "customSyntax": "postcss-less" }` — `<x> stylelint "**/*.{css,scss,less}"` (only the extensions present).
- markdownlint-cli2 — `.markdownlint-cli2.jsonc` — `"config": { "MD013": false, "MD024": false, "MD025": false, "MD031": false, "MD032": false, "MD033": false, "MD041": false, "MD047": false }` (`default: true` is the default, so it is not written), each rule commented with its name (line-length, no-duplicate-heading, single-h1, blanks-around-fences, blanks-around-lists, no-inline-html, first-line-h1, single-trailing-newline; MD047 is off so Markdown files end without a final newline). markdownlint-cli2 is the only Markdown tool; Prettier does not format Markdown — `<x> markdownlint-cli2 "**/*.md"`; fix mode `<x> markdownlint-cli2 --fix "**/*.md"`.
- yamllint — `.yamllint.yaml` (YAML only) — the `## YAML alignment` config: `extends: default`, line length off, every formatter-controlled rule explicit — `yamllint --strict .` (warnings fail).
- yamlfmt — `.yamlfmt.yaml` (YAML only) — the `## YAML alignment` `formatter` block, key for key the same as yamllint, no `max_line_length` — `yamlfmt -lint .`.
- hadolint — `.hadolint.yaml` (YAML only) — `ignored:` system package pins `DL3008` (apt-get), `DL3018` (apk), `DL3033` (yum), `DL3037` (zypper), `DL3041` (dnf); package-manager pins `DL3013` (pip), `DL3016` (npm), `DL3028` (gem), `DL3062` (go). hadolint has no Composer pin rule. Base image rules `DL3006` (untagged) and `DL3007` (`:latest`) stay on — `hadolint <Dockerfiles from the detect step>`.
- ShellCheck — `.shellcheckrc` — none — `shellcheck <shell files from the detect step, Bats files included>` (it reads `.bats` by extension).
- shfmt — `.editorconfig` — none — `shfmt -d <shell files>`; Bats files in their own run: `shfmt -d -ln bats <Bats files>`.
- Ruff — `ruff.toml`, or `[tool.ruff]` in `pyproject.toml` — none — `ruff check .`.
- Black — `[tool.black]` in `pyproject.toml` — none — `black --check .`.
- Flake8 — `.flake8` — none — `flake8 .`.
- mypy — `mypy.ini`, or `[tool.mypy]` in `pyproject.toml` — none — `mypy .`.
- Pint — `pint.json` — `{ "preset": "laravel" }` — `vendor/bin/pint --test`.
- PHP-CS-Fixer — `.php-cs-fixer.dist.php` (PHP only) — `(new PhpCsFixer\Config())->setRules(['@PSR12' => true])->setFinder(PhpCsFixer\Finder::create()->in(__DIR__)->exclude('vendor'))` — `vendor/bin/php-cs-fixer fix --dry-run --diff`.
- PHPStan — `phpstan.neon.dist` (NEON only; PHPStan also reads `phpstan.neon`, `phpstan.dist.neon`) — `parameters: { level: 5, paths: [<dirs holding PHP files, for example src, app, tests>] }` — `vendor/bin/phpstan analyse --no-progress`.
- PHP_CodeSniffer — `phpcs.xml.dist` (XML only; phpcs also reads `.phpcs.xml`, `phpcs.xml`, `.phpcs.xml.dist`) — `<ruleset>` with `<file>` per PHP source dir, `<arg name="extensions" value="php"/>`, `<rule ref="PSR12"/>`, and `Generic.Files.LineLength` `lineLimit` 120 — `vendor/bin/phpcs`.
- CSharpier — `.csharpierrc.json` (CSharpier also reads `.csharpierrc`, `.csharpierrc.yaml`, `.editorconfig`) — `{ "printWidth": 120 }` — `dotnet csharpier check .` (also its lint step).
- `dotnet format` — `.editorconfig` (the repo's own file; never written here) — none — `dotnet format style --verify-no-changes`, `dotnet format analyzers --verify-no-changes`.
- HTMLHint — `.htmlhintrc` — none — `<x> htmlhint "**/*.{html,htm}"`.
- gofmt, `go vet` — no config — `gofmt -l .`, `go vet ./...`.
- xmlstarlet — no config — none (formatter only; xmllint checks).
- xmllint — no config — `xmllint --noout <XML files>`.
- Taplo — `.taplo.toml` — none — `<x> taplo fmt --check`, `<x> taplo check` (via the package-manager exec form when installed from npm, else `taplo …`).
- actionlint — `.github/actionlint.yaml` — none — `actionlint` (no arguments: it finds the workflows).
- SQLFluff — `.sqlfluff` — `[sqlfluff]` with `dialect = <dialect>`; ask which dialect (`sqlfluff dialects` lists them), recommended `ansi`; unattended → `ansi` — `sqlfluff lint .` (formatting is applied with `sqlfluff format`; there is no check flag).
- `terraform fmt` — no config — `terraform fmt -check -recursive`.
- TFLint — `.tflint.hcl` — none — `tflint --recursive`.
- rustfmt, Clippy — rustfmt reads `rustfmt.toml` (none written) — `cargo fmt --all -- --check`, `cargo clippy -- -D warnings`.
- RuboCop — `.rubocop.yml` — none — `rubocop`.
- google-java-format — no config — `google-java-format --dry-run --set-exit-if-changed <Java files>`.
- Checkstyle — no config — `checkstyle -c /google_checks.xml <Java files>` (the bundled Google ruleset, 100-column limit like google-java-format).
- ktlint — `.editorconfig` (the repo's own file; never written here) — none — `ktlint`.
- SwiftFormat — `.swiftformat` — none — `swiftformat --lint .`.
- SwiftLint — `.swiftlint.yml` — `disabled_rules:` for the style rules SwiftFormat owns (`trailing_whitespace`, `trailing_comma`, `vertical_whitespace`, `opening_brace`, `statement_position`, `colon`, `comma`, `leading_whitespace`, `return_arrow_whitespace`, `trailing_newline`, `closing_brace`) and `strict: true` — `swiftlint lint`.
- Vue — ESLint config gains `...pluginVue.configs['flat/recommended']` for `**/*.vue`, then `eslintConfigPrettier` from `eslint-config-prettier/flat` as the last element; Prettier needs no change (it formats `.vue` itself).
- Svelte — ESLint config gains `svelte.configs.recommended`, then `svelte.configs.prettier`, after the other configs; `.prettierrc.json` gains `"plugins": ["prettier-plugin-svelte"]` and `"overrides": [{ "files": "*.svelte", "options": { "parser": "svelte" } }]`.
- clang-format — `.clang-format` — none (without one it falls back to the LLVM style) — `clang-format --dry-run --Werror <C/C++ files>`.
- clang-tidy — `.clang-tidy` — none — `clang-tidy -p . <C/C++ sources>`; no `compile_commands.json` in the repo or `build/` → skip and list `Open:` (CMake: `-DCMAKE_EXPORT_COMPILE_COMMANDS=ON`).
- StyLua — `stylua.toml` — none (120 columns) — `stylua --check .`.
- Luacheck — `.luacheckrc` — none (`max_line_length` 120, the same as StyLua) — `luacheck .`.

## Overlaps

Apply whatever each tool's config status is; append only missing entries.

- Prettier used with markdownlint-cli2 → add `*.md` and `*.markdown` to `.prettierignore`, so only markdownlint-cli2 touches Markdown.
- Prettier and yamlfmt both used → add `*.yaml` and `*.yml` to `.prettierignore`, so only yamlfmt formats YAML.
- Prettier used and another formatter chosen for XML or PHP → add `*.xml` or `*.php` to `.prettierignore`, and leave out its plugin, so one formatter owns each type.
- Pint and PHP_CodeSniffer both chosen → warn: phpcs `PSR12` sniffs flag Pint `laravel` preset output; recommend PHPStan, or a phpcs ruleset matching the preset.
- CSharpier and `dotnet format` both used → run only `dotnet format style` and `analyzers`, never bare `dotnet format` or `whitespace`, so CSharpier owns layout.
- SwiftFormat and SwiftLint both used → write the SwiftLint `disabled_rules` above so SwiftFormat owns layout.
- Checkstyle and google-java-format both used → keep Checkstyle on `google_checks.xml`; a custom Checkstyle config in the repo → `Open:` item that its indentation and line length must match google-java-format.
- Luacheck and StyLua both used → keep `max_line_length` at the same value in both (both default to 120); a kept config that differs → `Open:` item.
- Vue or Svelte ESLint used with Prettier → `eslint-config-prettier` goes last in the config so ESLint stays out of formatting.

## YAML alignment

yamlfmt and yamllint must agree on every setting the formatter controls, with line length off in both. Write both files from these values; each starts with `---` (the format both tools enforce), then one comment saying it mirrors the other, and uses flow mappings without inner spaces (`{key: value}`), the form yamlfmt writes. Check each key against the yamlfmt config docs and the yamllint rules docs before writing.

- `.yamllint.yaml`: `extends: default`, then `rules:` with `line-length: disable`, `truthy: {check-keys: false}` (GitHub Actions `on:` passes), `indentation: {spaces: 2}`; `document-start` (present), `comments` (2 spaces), `indent-sequences` (true), `new-lines` (unix), and `empty-lines` (max 2) stay at their defaults and are not written.
- `.yamlfmt.yaml`: `formatter:` with `include_document_start: true`, `pad_line_comments: 2`, `line_ending: lf` (its default is `crlf` on Windows), `eof_newline: true`, `trim_trailing_whitespace: true`, `retain_line_breaks_single: true`; never `max_line_length` (unset = no wrapping).
- Prettier formats YAML (fallback) → yamllint adds `document-start: disable` and `comments: {min-spaces-from-content: 1}`, which is what Prettier writes (both differ from the yamllint defaults); the rest stays as above.
- One of the two files exists → derive the new one from the kept one's values. Both kept and in conflict (a different indent, comment padding, document start, line ending, or sequence indent, counting a default as its value) → never overwrite; add an `Open:` item naming the key and the fix. A kept config with a line-length limit (`line-length` rule not `disable`, or `max_line_length`) → `Open:` item to disable it.
