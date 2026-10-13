# Ignores

Syntax and candidate paths for the ignore step. Look for each config in the git root and the package dir; `<entry>` is relative to the config's dir.

## Syntax

Format: tool — config — add `<entry>` to — skip when. Append only missing entries; keep existing entries, order, and syntax form. An ignore file may be created for a tool the run chose or kept; a config in a form not listed or not parseable → report the file, skip it.

- Prettier — `.prettierignore` — new line — never.
- markdownlint — `.markdownlintignore` — new line — never.
- markdownlint-cli2 — `.markdownlint-cli2.jsonc`, `.markdownlint-cli2.yaml` — `ignores` array — `"gitignore": true`.
- Stylelint — `.stylelintignore` — new line — never.
- ESLint legacy — `.eslintignore` — new line — an `eslint.config.*` exists (flat config ignores this file).
- ESLint flat — `eslint.config.*` — existing `globalIgnores([...])` call or ignores-only object; none → `{ ignores: ['<entry>'] }` as its own array element — `includeIgnoreFile(<path to .gitignore>)` is used.
- yamllint — `.yamllint`, `.yamllint.yaml`, `.yamllint.yml` — `ignore:` in its existing form (block string or list); none → add a block string — `ignore-from-file` lists `.gitignore`.
- yamlfmt — `.yamlfmt`, `.yamlfmt.yaml`, `.yamlfmt.yml`, `yamlfmt.yaml` — `exclude` list — `gitignore_excludes: true`.
- Ruff `extend-exclude`, Black `extend-exclude` (regex), Flake8 `extend-exclude`, PHP-CS-Fixer `Finder->exclude()`, PHPStan `excludePaths.analyseAndScan`, PHP_CodeSniffer `<exclude-pattern>`, CSharpier `.csharpierignore`.
- HTMLHint has no ignore file: add `--ignore "<pattern>,…"` to its check command (it skips `**/node_modules/**` by default).
- `dotnet format` takes `--exclude <paths>` on its check commands.
- hadolint, ShellCheck, shfmt, gofmt, `go vet`, xmllint take explicit paths, so nothing to configure.

## Candidate paths

Offer only paths that exist; every npm tool skips `node_modules/` by default.

- Build output: `dist/`, `build/`, `out/`, `.next/`, `.nuxt/`, `.turbo/`, `bin/`, `obj/`, `target/`, `__pycache__/`.
- Coverage and caches: `coverage/`, `htmlcov/`, `.pytest_cache/`, `.mypy_cache/`, `.ruff_cache/`.
- Vendored deps: `vendor/`, `.venv/`, `venv/`, `.pnpm-store/`.
- Lockfiles: `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lock`, `composer.lock`.
- Generated hooks: `.husky/_/`.
