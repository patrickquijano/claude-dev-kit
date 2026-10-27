# Formatter conflicts

Per-pair rules for step 3 (which formatter is present) and step 8 (the disables to write). Disable only what the formatter's own docs list as conflicting, through the toolchain's official mechanism; write only entries missing from the config, and list every disabled rule in `Disabled rules:`. A pair not listed → no disable is written; add an `Open:` item "review manually: <linter> vs <formatter>".

## Detecting the formatter

A formatter is present when its config exists (`flow.md` `## Formatters present`). One formatter → plan its disables. Several → ask which applies. None → disable nothing.

## Entries

- ESLint + Prettier (also Vue): append `eslint-config-prettier/flat` as the last element of the config array, so it comes after the configs it overrides. Package `eslint-config-prettier`. Check: `npx eslint-config-prettier <file>` exits 0 (no problems), 1 (error), 2 (conflicts remain). <https://github.com/prettier/eslint-config-prettier>
- ESLint + Prettier (Svelte): `svelte.configs.prettier` from `eslint-plugin-svelte`, which the docs describe as disabling rules that may conflict with Prettier; place it after the other Svelte configs. <https://sveltejs.github.io/eslint-plugin-svelte/user-guide/>
- Ruff lint + Ruff format: avoid `W191`, `E111`, `E114`, `E117`, `D203`, `D206`, `D300`, `Q000`–`Q004`, `COM812`, and `COM819`, plus `ISC002` when used without `ISC001` and `flake8-implicit-str-concat.allow-multiline = false`. None is in Ruff's defaults; when a kept `select` enables one (or its category, such as `Q`), add it to `lint.ignore`. `ruff format` warns when a selected rule conflicts. <https://docs.astral.sh/ruff/formatter/#conflicting-lint-rules>
- Flake8 + Black: in `.flake8` set `max-line-length = 88` and `extend-ignore = E203,E701`. <https://black.readthedocs.io/en/stable/guides/using_black_with_other_tools.html>
- Pylint + Black: set `max-line-length = 88`. Same source.
- Stylelint 16 or newer + Prettier: nothing to disable; the stylistic rules were removed in 16. An older Stylelint → `Open:` "upgrade or review manually". <https://stylelint.io/migration-guide/to-16/>
- markdownlint + Prettier: extend `markdownlint/style/prettier` in the markdownlint config. <https://github.com/DavidAnson/markdownlint/blob/main/doc/Prettier.md>

## Manual review

Every other pair has no official conflict list, among them SwiftLint with SwiftFormat, PHP_CodeSniffer with Pint or PHP-CS-Fixer, Checkstyle with google-java-format, Luacheck with StyLua, `dotnet format` with CSharpier, and yamllint with yamlfmt (aligned by `configs.md` `## YAML alignment`). Record each as an `Open:` item naming both tools and the formatter's config path; never invent a disabled-rule list.
