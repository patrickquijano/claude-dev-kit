# Lint and format ignores

Step 8 detail. Generated JSON, Markdown, and HTML only add noise, so each existing tool config skips `graphify-out/`.

## Contents

- Rules · Linters and formatters · Docker and npm

## Rules

- Look for each config in the repo root and the package dir. Edit only configs that already exist.
- Append only missing entries; keep existing entries, order, and syntax form.
- Do not skip a tool because it reads `.gitignore`: step 7 un-ignores two files there, so those tools would lint them.
- Config form not listed or not parseable → report the file, skip it.

## Linters and formatters

Format: tool, config, what to add.

- Prettier: `.prettierignore`, new line `graphify-out/`.
- markdownlint: `.markdownlintignore`, new line `graphify-out/`.
- markdownlint-cli2: `.markdownlint-cli2.jsonc` or `.markdownlint-cli2.yaml`, `ignores` array entry `graphify-out/`.
- Stylelint: `.stylelintignore`, new line `graphify-out/`.
- ESLint legacy: `.eslintignore`, new line; skip when an `eslint.config.*` exists (flat config ignores this file).
- ESLint flat: `eslint.config.*`, entry in an existing `globalIgnores([...])` call or ignores-only object; none → `{ ignores: ['graphify-out/'] }` as its own array element.
- Biome: `biome.json` or `biome.jsonc`. `files.includes` present → negation entry `"!**/graphify-out"` (absent → set `["**", "!**/graphify-out"]`). `files.ignore` or `files.include` present → ignore entry `graphify-out`. Neither → use the form the installed `node_modules/@biomejs/biome/configuration_schema.json` defines under `FilesConfiguration.properties`; no schema → report, skip.
- yamllint: `.yamllint`, `.yamllint.yaml`, or `.yamllint.yml`, `ignore:` in its existing form (block string or list); none → add a block string.
- yamlfmt: `.yamlfmt`, `.yamlfmt.yaml`, `.yamlfmt.yml`, or `yamlfmt.yaml`, `exclude` list entry.
- CSpell: `cspell.json`, `.cspell.json`, `cspell.config.*`, or the `cspell` key in `package.json`, `ignorePaths` array entry.
- dprint: no entry syntax; report it, do not edit.

## Docker and npm

- Docker: `.dockerignore` or `<Dockerfile>.dockerignore`, new line `graphify-out/` relative to the build context.
- npm: do not edit; report that sharing the graph files in a published package is the user's call.
