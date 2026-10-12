---
paths:
  - '**/*.mjs'
  - 'tests/**'
---

# Tests

- A runtime ES module (`hooks/`, `.claude/hooks/`, `.husky/`, `skills/*/assets/`; not config such as `eslint.config.mjs`) has a unit test under `tests/unit/` at the mirrored path (`hooks/scripts/lib/a.mjs` → `tests/unit/hooks/scripts/lib/a.test.mjs`), with ≥2 positive and ≥2 negative cases per exported function.
- Every test is AAA: `// Arrange`, `// Act`, `// Assert`, one Act per test. Names state behavior and condition. `node:test` + `node:assert/strict`.
- Unit tests do I/O only through stubbed `deps` (`.claude/rules/es-modules.md`) and never touch real fs, git, network, or processes: `grep -rn "node:child_process\|mkdtemp" tests/unit` stays empty (stub keys named `spawn` are fine).
- Behavior that needs real I/O (temp git repos, spawned CLIs, stdin→stdout contracts) goes in `tests/integration/` at the mirrored path. Same AAA, temp dirs removed in `after`, no network.
- No integration tests in `tests/unit/`; move existing ones with `git mv` so history follows.
- Node's `**` glob skips dot directories: `package.json` lists `tests/{unit,integration}/.claude` and `.husky` globs explicitly; add one when a test lands under a new dot directory.
- Verify: `npm test` (`test:unit` and `test:integration` run each suite alone).
