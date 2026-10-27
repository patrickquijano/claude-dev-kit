# Configs

## Contents

- Config files and defaults · Overlaps · YAML alignment

## Config files and defaults

Format: tool — config file — recommended defaults — check command. `<x>` = the exec form for installed binaries from `package-manager.md` (`npx --no-install`, `pnpm exec`, `yarn`, `bunx --no-install`). Preference `.jsonc` > `.json` > `.yaml`. A tool that supports none of these uses its native format, as listed. Configured = any config file the tool reads already exists, including a `package.json` key. `none` = tool defaults are the recommendation; write no config and ask nothing. Write only keys whose value differs from the tool's default: a key that restates a default is dropped (checked against each tool's docs). A configured tool whose config differs from these defaults → show the diff and ask `Overwrite` | `Keep`.

- Prettier — `.prettierrc.json` (Prettier reads no `.jsonc`) — `{ "printWidth": 120, "singleQuote": true, "trailingComma": "none" }`, plus `"plugins"` with `@prettier/plugin-xml` when Prettier formats XML and `@prettier/plugin-php` when it formats PHP — `<x> prettier --check .`.
- yamlfmt — `.yamlfmt.yaml` (YAML only) — the `## YAML alignment` `formatter` block, no `max_line_length` — `yamlfmt -lint .`.
- shfmt — `.editorconfig` — none — `shfmt -d <shell files>`; Bats files in their own run: `shfmt -d -ln bats <Bats files>`.
- Ruff (format) — `ruff.toml`, or `[tool.ruff]` in `pyproject.toml` — none — `ruff format --check .`.
- Black — `[tool.black]` in `pyproject.toml` — none — `black --check .`.
- Pint — `pint.json` — `{ "preset": "laravel" }` — `vendor/bin/pint --test`.
- PHP-CS-Fixer — `.php-cs-fixer.dist.php` (PHP only) — `(new PhpCsFixer\Config())->setRules(['@PSR12' => true])->setFinder(PhpCsFixer\Finder::create()->in(__DIR__)->exclude('vendor'))` — `vendor/bin/php-cs-fixer fix --dry-run --diff`.
- CSharpier — `.csharpierrc.json` (CSharpier also reads `.csharpierrc`, `.csharpierrc.yaml`, `.editorconfig`) — `{ "printWidth": 120 }` — `dotnet csharpier check .`.
- gofmt — no config — `gofmt -l .`.
- xmlstarlet — no config — none (no check command); xmllint formats with `--format` and has no check flag either.
- Taplo (format) — `.taplo.toml` — none — `<x> taplo fmt --check` (via the package-manager exec form when installed from npm, else `taplo fmt --check`).
- SQLFluff (format) — `.sqlfluff` — `[sqlfluff]` with `dialect = <dialect>`; ask which dialect (`sqlfluff dialects` lists them), recommended `ansi` — no check flag exists; report `not checked`.
- `terraform fmt` — no config — `terraform fmt -check -recursive`.
- rustfmt — `rustfmt.toml` (none written) — `cargo fmt --all -- --check`.
- google-java-format — no config — `google-java-format --dry-run --set-exit-if-changed <Java files>`.
- ktlint (format) — `.editorconfig` (the repo's own file; never written here) — none — `ktlint`.
- SwiftFormat — `.swiftformat` — none — `swiftformat --lint .`.
- clang-format — `.clang-format` — none (without one it falls back to the LLVM style) — `clang-format --dry-run --Werror <C/C++ files>`.
- StyLua — `stylua.toml` — none (120 columns) — `stylua --check .`.
- Svelte — `.prettierrc.json` gains `"plugins": ["prettier-plugin-svelte"]` and `"overrides": [{ "files": "*.svelte", "options": { "parser": "svelte" } }]`.
- Vue — Prettier formats `.vue` itself; no config change.

## Overlaps

Apply whatever each tool's config status is; append only missing entries.

- Prettier used and a Markdown linter in the repo (`.markdownlint*` config or `markdownlint-cli2` in the manifest) → add `*.md` and `*.markdown` to `.prettierignore`, so only the Markdown tool touches Markdown.
- Prettier and yamlfmt both used → add `*.yaml` and `*.yml` to `.prettierignore`, so only yamlfmt formats YAML.
- Prettier used and another formatter chosen for XML or PHP → add `*.xml` or `*.php` to `.prettierignore`, and leave out its plugin, so one formatter owns each type.

## YAML alignment

The yamlfmt file has line length off. It starts with `---` (the form yamlfmt enforces), then one comment line, and uses flow mappings without inner spaces (`{key: value}`). Check each key against the yamlfmt config docs before writing.

- `.yamlfmt.yaml`: `formatter:` with `include_document_start: true`, `pad_line_comments: 2`, `line_ending: lf` (its default is `crlf` on Windows), `eof_newline: true`, `trim_trailing_whitespace: true`, `retain_line_breaks_single: true`; never `max_line_length` (unset = no wrapping).
- A `.yamllint*` file exists → read its indent, comment padding, document start, and sequence indent, and write the `formatter` block to match it; a value it cannot match is an `Open:` item naming the key.
- Prettier formats YAML (fallback) → no yamlfmt file is written.
- An existing `.yamlfmt.yaml` differing from these values → the `Overwrite` | `Keep` ask applies; never merge silently.
