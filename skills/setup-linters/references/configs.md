# Configs

## Contents

- Config files and defaults · YAML alignment

## Config files and defaults

Format: tool — config file — recommended defaults — check command. `<x>` = the exec form for installed binaries from `flow.md` `## Package manager` (`npx --no-install`, `pnpm exec`, `yarn`, `bunx --no-install`). Preference `.jsonc` > `.json` > `.yaml`. A tool that supports none of these uses its native format, as listed. Configured = any config file the tool reads already exists, including a `package.json` key. `none` = tool defaults are the recommendation; write no config and ask nothing. Write only keys whose value differs from the tool's default: a key that restates a default is dropped (checked against each tool's docs). A configured tool whose config differs from these defaults → show the diff and ask `Overwrite` | `Keep`. A present formatter adds the disables in `formatter-conflicts.md` on top.

- ESLint — `eslint.config.mjs` (flat config is JavaScript only) — `defineConfig` with `@eslint/js` recommended on `**/*.{js,mjs,cjs}` and `globals` for the runtime (`globals.node`, `globals.browser`). TS files → add `tseslint.configs.recommended` from `typescript-eslint`. JSX files → `languageOptions.parserOptions.ecmaFeatures.jsx: true` on `**/*.jsx`. JSON linted → `import json from '@eslint/json'`, then `{ files: ['**/*.json'], ignores: ['package-lock.json'], plugins: { json }, language: 'json/json', extends: ['json/recommended'] }` and the same on `**/*.jsonc` with `language: 'json/jsonc'`. — `<x> eslint .`.
- Stylelint — `.stylelintrc.json` — `{ "extends": ["stylelint-config-standard"] }`; SCSS files → also `"overrides": [{ "files": ["**/*.scss"], "extends": ["stylelint-config-standard-scss"] }]`; Less files → also an override `{ "files": ["**/*.less"], "customSyntax": "postcss-less" }` — `<x> stylelint "**/*.{css,scss,less}"` (only the extensions present).
- markdownlint-cli2 — `.markdownlint-cli2.jsonc` — `"config": { "MD013": false, "MD024": false, "MD025": false, "MD031": false, "MD032": false, "MD033": false, "MD041": false, "MD047": false }` (`default: true` is the default, so it is not written), each rule commented with its name (line-length, no-duplicate-heading, single-h1, blanks-around-fences, blanks-around-lists, no-inline-html, first-line-h1, single-trailing-newline; MD047 is off so Markdown files end without a final newline). markdownlint-cli2 is the only Markdown tool; Prettier does not format Markdown — `<x> markdownlint-cli2 "**/*.md"`; fix mode `<x> markdownlint-cli2 --fix "**/*.md"`.
- yamllint — `.yamllint.yaml` (YAML only) — the `## YAML alignment` config: `extends: default`, line length off, every formatter-controlled rule explicit — `yamllint --strict .` (warnings fail).
- hadolint — `.hadolint.yaml` (YAML only) — `ignored:` system package pins `DL3008` (apt-get), `DL3018` (apk), `DL3033` (yum), `DL3037` (zypper), `DL3041` (dnf); package-manager pins `DL3013` (pip), `DL3016` (npm), `DL3028` (gem), `DL3062` (go). hadolint has no Composer pin rule. Base image rules `DL3006` (untagged) and `DL3007` (`:latest`) stay on — `hadolint <Dockerfiles from the detect step>`.
- ShellCheck — `.shellcheckrc` — none — `shellcheck <shell files from the detect step, Bats files included>` (it reads `.bats` by extension).
- Ruff (lint) — `ruff.toml`, or `[tool.ruff]` in `pyproject.toml` — none — `ruff check .`.
- Flake8 — `.flake8` — none — `flake8 .`.
- mypy — `mypy.ini`, or `[tool.mypy]` in `pyproject.toml` — none — `mypy .`.
- PHPStan — `phpstan.neon.dist` (NEON only; PHPStan also reads `phpstan.neon`, `phpstan.dist.neon`) — `parameters: { level: 5, paths: [<dirs holding PHP files, for example src, app, tests>] }` — `vendor/bin/phpstan analyse --no-progress`.
- PHP_CodeSniffer — `phpcs.xml.dist` (XML only; phpcs also reads `.phpcs.xml`, `phpcs.xml`, `.phpcs.xml.dist`) — `<ruleset>` with `<file>` per PHP source dir, `<arg name="extensions" value="php"/>`, `<rule ref="PSR12"/>`, and `Generic.Files.LineLength` `lineLimit` 120 — `vendor/bin/phpcs`.
- `dotnet format` — `.editorconfig` (the repo's own file; never written here) — none — `dotnet format style --verify-no-changes`, `dotnet format analyzers --verify-no-changes`.
- HTMLHint — `.htmlhintrc` — none — `<x> htmlhint "**/*.{html,htm}"`.
- `go vet` — no config — `go vet ./...`.
- xmllint — no config — `xmllint --noout <XML files>`.
- Taplo (check) — `.taplo.toml` — none — `<x> taplo check` (via the package-manager exec form when installed from npm, else `taplo …`).
- actionlint — `.github/actionlint.yaml` — none — `actionlint` (no arguments: it finds the workflows).
- SQLFluff — `.sqlfluff` — `[sqlfluff]` with `dialect = <dialect>`; ask which dialect (`sqlfluff dialects` lists them), recommended `ansi` — `sqlfluff lint .`.
- TFLint — `.tflint.hcl` — none — `tflint --recursive`.
- Clippy — no config — `cargo clippy -- -D warnings`.
- RuboCop — `.rubocop.yml` — none — `rubocop`.
- Checkstyle — no config — `checkstyle -c /google_checks.xml <Java files>` (the bundled Google ruleset).
- ktlint (lint) — `.editorconfig` (the repo's own file; never written here) — none — `ktlint`.
- SwiftLint — `.swiftlint.yml` — `strict: true` — `swiftlint lint`.
- Vue — ESLint config gains `...pluginVue.configs['flat/recommended']` for `**/*.vue`; formatter conflicts per `formatter-conflicts.md`.
- Svelte — ESLint config gains `svelte.configs.recommended` after the other configs; formatter conflicts per `formatter-conflicts.md`.
- clang-tidy — `.clang-tidy` — none — `clang-tidy -p . <C/C++ sources>`; no `compile_commands.json` in the repo or `build/` → skip and list `Open:` (CMake: `-DCMAKE_EXPORT_COMPILE_COMMANDS=ON`).
- Luacheck — `.luacheckrc` — none (`max_line_length` 120) — `luacheck .`.

## YAML alignment

yamllint is written to agree with the repo's YAML formatter on every setting the formatter controls, with line length off. The file starts with `---`, then one comment line, and uses flow mappings without inner spaces (`{key: value}`). Check each key against the yamllint rules docs before writing.

- `.yamllint.yaml`: `extends: default`, then `rules:` with `line-length: disable`, `truthy: {check-keys: false}` (GitHub Actions `on:` passes), `indentation: {spaces: 2}`; `document-start` (present), `comments` (2 spaces), `indent-sequences` (true), `new-lines` (unix), and `empty-lines` (max 2) stay at their defaults and are not written.
- A `.yamlfmt*` file exists → derive the values from it (indent, `pad_line_comments`, `include_document_start`, `line_ending`); a conflict between the two files → never overwrite; add an `Open:` item naming the key and the fix.
- Prettier formats YAML (no yamlfmt) → add `document-start: disable` and `comments: {min-spaces-from-content: 1}`, which is what Prettier writes (both differ from the yamllint defaults).
- A kept config with a line-length limit (`line-length` rule not `disable`) → `Open:` item to disable it.
