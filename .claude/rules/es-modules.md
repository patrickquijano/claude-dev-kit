---
paths:
  - '**/*.mjs'
---

# ES modules

- Run commands with `execFileSync` or `spawnSync` and an argument array; never `eval`, `new Function`, or input interpolated into a command. `shell: true` only for Windows `.cmd` shims, with fixed args or args rejected for cmd.exe metacharacters (`"`, `%`, `!`, `^`, CR, LF; see `WIN_UNSAFE` in `hooks/scripts/lib/tools.mjs`). Set an explicit `timeout` on every child process.
- Parse hook stdin with `readJsonStdin` (throws on empty, invalid, or non-object input); check field types before use.
- A `catch` skips only a named expected condition (`expected(err, 'ENOENT', …)` or `instanceof SyntaxError`) and rethrows the rest; never a bare `catch {}`.
- Resolve file paths and check they stay inside `CLAUDE_PROJECT_DIR` or the repo root before reading or writing.
- Never log secrets or env values. No network calls unless they are the module's purpose.
- Exit codes and output follow `.claude/rules/hooks.md`.
- Pass side effects (runner, `fs`, env, clock, stdin/stdout) in as a `deps` parameter that defaults to the real one; keep the CLI body behind a main guard so an import never runs it. Tests: `.claude/rules/tests.md`.
- Verify: `npm run lint`, `npm run test:unit`, then `npm audit --audit-level=moderate`.
