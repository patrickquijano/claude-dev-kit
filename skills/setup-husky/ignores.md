# Ignores

Where step 14 adds the Husky paths. Husky regenerates `.husky/_/` on every install, so tools should skip it; `.husky/*.mjs` stay linted because they are project code.

- Look for each config in the git root and the package dir. `<entry>` is relative to the config's dir: `.husky/_/` beside the package, `<pkg>/.husky/_/` at the git root.
- Edit only configs that already exist; never create one for a tool the project does not use.
- Append only missing entries; keep existing entries, order, and syntax form.
- Skip a config when its skip condition holds.
- Config form not listed or not parseable → report the file, skip it.

## Linters and formatters

Format: tool — config — add `<entry>` to — skip when.

- Prettier — `.prettierignore` — new line — never (whether Prettier also reads `.gitignore` depends on the installed release and on `--ignore-path`, so the entry is always safe to add).
- markdownlint — `.markdownlintignore` — new line — never.
- markdownlint-cli2 — `.markdownlint-cli2.jsonc`, `.markdownlint-cli2.yaml` — `ignores` array — `"gitignore": true`.
- Stylelint — `.stylelintignore` — new line — never.
- ESLint legacy — `.eslintignore` — new line — an `eslint.config.*` exists (flat config ignores this file).
- ESLint flat — `eslint.config.*` — existing `globalIgnores([...])` call or ignores-only object; none → `{ ignores: ['<entry>'] }` as its own array element (works on every flat-config version) — `includeIgnoreFile(<path to .gitignore>)` is used.
- Biome — `biome.json`, `biome.jsonc` — form by config key: `files.includes` present → negation form; `files.ignore` or `files.include` present → ignore form; neither → the form whose key the installed `node_modules/@biomejs/biome/configuration_schema.json` defines under `FilesConfiguration.properties` (`includes` → negation, `ignore` → ignore); no schema file → report and skip. Negation form: `files.includes` entry `"!**/.husky/_"` (no trailing `/**`); `files.includes` absent → set `["**", "!**/.husky/_"]`, since a lone negation includes nothing. Ignore form: `files.ignore` entry `.husky/_` — `vcs.enabled` and `vcs.useIgnoreFile` both `true`.
- yamllint — `.yamllint`, `.yamllint.yaml`, `.yamllint.yml` — `ignore:` in its existing form (block string or list); no `ignore:` → add a block string — `ignore-from-file` lists `.gitignore`.
- yamlfmt — `.yamlfmt`, `.yamlfmt.yaml`, `.yamlfmt.yml`, `yamlfmt.yaml` — `exclude` list — `gitignore_excludes: true`.
- CSpell — `cspell.json`, `.cspell.json`, `cspell.config.*`, `cspell` key in `package.json` — `ignorePaths` array — `useGitignore: true`.
- dprint — `dprint.json`, `.dprint.json` — nothing — always; dprint skips gitignored files by default.

## Package and build contexts

- npm — package dir `.npmignore` only (a root one does not apply to a nested package) — add `.husky/`; hooks are dev tooling and never ship — `package.json` has `files` (the allowlist already excludes hooks).
- Docker — `.dockerignore` or `<Dockerfile>.dockerignore` — add `<entry>` relative to the build context (normally the file's dir); keeps generated stubs out of the image — never.
