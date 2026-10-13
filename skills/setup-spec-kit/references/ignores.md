# Lint and format ignores

Step 5 detail.

- Line-based ignore files: `.prettierignore`, `.markdownlintignore`, `.stylelintignore`, and `.eslintignore` only when no `eslint.config.*` exists (flat config ignores that file).
- `ignores` array: `.markdownlint-cli2.jsonc`, `.markdownlint-cli2.yaml`.
- `eslint.config.*`: add `.specify/**` and `.claude/skills/speckit-*/**` to the existing global-ignores object (an object with only `ignores`); none → add `{ ignores: [...] }` as its own array element.
- `.yamllint`, `.yamllint.yaml`, `.yamllint.yml`: add to `ignore:` in its existing form (block string or list); no `ignore:` → add a block string.
- Config form not listed or not parseable → report the file, skip it.
