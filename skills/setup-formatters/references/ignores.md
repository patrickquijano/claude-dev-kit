# Ignores

Syntax and candidate paths for the ignore step (step 8). Look for each config in the git root and the package dir; `<entry>` is relative to the config's dir.

## Explicit

Every chosen or kept formatter lists each candidate path that exists, even when it inherits `.gitignore` or skips the path by default. Configs this run writes get no `gitignore_excludes` or `"gitignore": true`; a user config keeps the ones it has.

## Syntax

Format: tool — config — add `<entry>` to — skip when. Append only missing entries; keep existing entries, order, and syntax form. An ignore file may be created for a tool the run chose or kept; a config in a form not listed or not parseable → report the file, skip it.

- Prettier — `.prettierignore` — new line — never.
- yamlfmt — `.yamlfmt`, `.yamlfmt.yaml`, `.yamlfmt.yml`, `yamlfmt.yaml` — `exclude` list — never.
- Ruff `extend-exclude`, Black `extend-exclude` (regex), PHP-CS-Fixer `Finder->exclude()`, CSharpier `.csharpierignore`.
- Taplo — `.taplo.toml` — `exclude` glob array.
- SQLFluff — `.sqlfluffignore` — new line (gitignore syntax).
- SwiftFormat — `.swiftformat` — `--exclude <comma-separated paths>`.
- clang-format — `.clang-format-ignore` — new line (gitignore syntax).
- StyLua — `.styluaignore` — new line (gitignore syntax).
- ktlint — no ignore file: add `'!<glob>'` arguments to its check command.
- shfmt, gofmt, xmlstarlet, xmllint, `terraform fmt`, rustfmt, google-java-format take explicit paths or run scoped to their project, so nothing to configure.

## Candidate paths

Offer only paths that exist. `bin/`, `build/`, and `out/` also need a matching line in the repo `.gitignore` (read it); they can hold source or committed scripts.

- Build output: `dist/`, `build/`, `out/`, `.next/`, `.nuxt/`, `.turbo/`, `bin/`, `obj/`, `target/`, `__pycache__/`, `.gradle/`, `.build/` (Swift).
- Coverage and caches: `coverage/`, `htmlcov/`, `.pytest_cache/`, `.mypy_cache/`, `.ruff_cache/`, `.terraform/`.
- Vendored deps: `node_modules/`, `vendor/`, `.venv/`, `venv/`, `.pnpm-store/`, `Pods/`, `.bundle/`.
- Lockfiles: `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lock`, `composer.lock`, `Cargo.lock`, `Gemfile.lock`, `uv.lock`, `poetry.lock`, `.terraform.lock.hcl`.
- Generated hooks: `.husky/_/`.
