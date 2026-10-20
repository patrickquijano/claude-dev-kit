# Ignores

Syntax and candidate paths for the ignore step. Look for each config in the git root and the package dir; `<entry>` is relative to the config's dir.

## Explicit

Every chosen or kept tool lists each candidate path that exists, even when it inherits `.gitignore` or skips the path by default. Configs this run writes get no `gitignore_excludes`, `ignore-from-file`, `includeIgnoreFile`, or `"gitignore": true`; a user config keeps the ones it has.

## Syntax

Format: tool — config — add `<entry>` to — skip when. Append only missing entries; keep existing entries, order, and syntax form. An ignore file may be created for a tool the run chose or kept; a config in a form not listed or not parseable → report the file, skip it.

- Prettier — `.prettierignore` — new line — never.
- markdownlint — `.markdownlintignore` — new line — never.
- markdownlint-cli2 — `.markdownlint-cli2.jsonc`, `.markdownlint-cli2.yaml` — `ignores` array — never.
- Stylelint — `.stylelintignore` — new line — never.
- ESLint legacy — `.eslintignore` — new line — an `eslint.config.*` exists (flat config never reads this file).
- ESLint flat — `eslint.config.*` — existing `globalIgnores([...])` call or ignores-only object; none → `{ ignores: ['<entry>'] }` as its own array element — never.
- yamllint — `.yamllint`, `.yamllint.yaml`, `.yamllint.yml` — `ignore:` in its existing form (block string or list); none → add a block string — never.
- yamlfmt — `.yamlfmt`, `.yamlfmt.yaml`, `.yamlfmt.yml`, `yamlfmt.yaml` — `exclude` list — never.
- Ruff `extend-exclude`, Black `extend-exclude` (regex), Flake8 `extend-exclude`, PHP-CS-Fixer `Finder->exclude()`, PHPStan `excludePaths.analyseAndScan`, PHP_CodeSniffer `<exclude-pattern>`, CSharpier `.csharpierignore`.
- mypy — `exclude` regex in `mypy.ini` `[mypy]` or `[tool.mypy]`.
- Taplo — `.taplo.toml` — `exclude` glob array.
- SQLFluff — `.sqlfluffignore` — new line (gitignore syntax).
- RuboCop — `.rubocop.yml` — `AllCops: Exclude` list.
- SwiftFormat — `.swiftformat` — `--exclude <comma-separated paths>`.
- SwiftLint — `.swiftlint.yml` — `excluded:` list.
- clang-format — `.clang-format-ignore` — new line (gitignore syntax).
- StyLua — `.styluaignore` — new line (gitignore syntax).
- Luacheck — `.luacheckrc` — `exclude_files` array of globs.
- ktlint — no ignore file: add `'!<glob>'` arguments to its check command.
- HTMLHint has no ignore file: add `--ignore "<pattern>,…"` to its check command, always including `**/node_modules/**`.
- `dotnet format` takes `--exclude <paths>` on its check commands, listing every candidate path.
- hadolint, ShellCheck, shfmt, gofmt, `go vet`, xmllint, actionlint, `terraform fmt`, TFLint, rustfmt, Clippy, google-java-format, Checkstyle, clang-tidy take explicit paths or run scoped to their project, so nothing to configure.

## Candidate paths

Offer only paths that exist.

- Build output: `dist/`, `build/`, `out/`, `.next/`, `.nuxt/`, `.turbo/`, `bin/`, `obj/`, `target/`, `__pycache__/`, `.gradle/`, `.build/` (Swift).
- Coverage and caches: `coverage/`, `htmlcov/`, `.pytest_cache/`, `.mypy_cache/`, `.ruff_cache/`, `.terraform/`.
- Vendored deps: `node_modules/`, `vendor/`, `.venv/`, `venv/`, `.pnpm-store/`, `Pods/`, `.bundle/`.
- Lockfiles: `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lock`, `composer.lock`, `Cargo.lock`, `Gemfile.lock`, `uv.lock`, `poetry.lock`, `.terraform.lock.hcl`.
- Generated hooks: `.husky/_/`.
