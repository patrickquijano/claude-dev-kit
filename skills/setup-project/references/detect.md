# Detect

Read-only checks at the repo root for step 2; each setup is `configured`, `partial`, or `missing`. Commands by name in `commands.md`.

- git: `gpgsign` is `true` and `signingkey` is set, plus `.gitignore` exists → configured; one of the two → partial; neither, or not a git repo → missing.
- EditorConfig: `.editorconfig` with `root = true` and a `[*]` section → configured; file without either → partial; no file → missing.
- Formatters and linters: any tool config exists → partial (a re-run fills missing roles); none → missing. Never report configured. Configs: `.prettierrc*`, `prettier.config.*`, `eslint.config.*`, `.eslintrc*`, `.stylelintrc*`, `stylelint.config.*`, `.markdownlint*`, `.yamllint*`, `.htmlhintrc`, `.hadolint.yaml`, `.shellcheckrc`, `.yamlfmt*`, `ruff.toml`, `.ruff.toml`, `pint.json`, `.php-cs-fixer*`, `phpstan.neon*`, `phpcs.xml*`, `.config/dotnet-tools.json`.
- Husky: `.husky/commit-msg` or `.husky/post-commit` at the root or in a `package.json` directory → configured; `.husky/` without them → partial; none → missing.
- Test tooling: a runner config file or manifest key exists for each of unit, integration, and e2e → configured; some → partial; none → missing. Runners: Vitest, Jest, Mocha, `node:test`, pytest, Playwright, Cypress, Go and Rust built-ins, PHPUnit, Pest, xUnit, NUnit.
