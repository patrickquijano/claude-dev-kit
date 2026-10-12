---
paths:
  - '**/*.mjs'
---

# ES modules

- Import built-ins with the `node:` specifier.
- Run commands with `execFileSync` or `spawnSync` and an argument array; never `shell: true`, `eval`, `new Function`, or input interpolated into a command. Set an explicit `timeout` on every child process.
- `JSON.parse` hook stdin inside a `try`, then check its shape and types before use.
- Resolve file paths and check they stay inside `CLAUDE_PROJECT_DIR` or the repo root before reading or writing.
- Never log secrets or env values. No network calls unless they are the module's purpose.
- Exit codes and output follow `.claude/rules/hooks.md`.
- Export the logic as named functions and pass side effects (runner, `fs`, env, clock, stdin/stdout) in as a `deps` parameter that defaults to the real one; keep the CLI body behind a main guard so an import never runs it. Tests: `.claude/rules/tests.md`.
- Justified lint disables go inline with a one-line reason; `eslint.config.mjs` turns off `security/detect-non-literal-fs-filename` and `detect-object-injection` (path containment is checked by hand).
- Verify: `npm run lint`, then `npm audit --audit-level=moderate` (`markdownlint-cli2` → `braces` is a known upstream finding with no non-breaking fix).
