---
paths:
  - '**/*.mjs'
  - 'tests/**'
---

# Tests

- A runtime ES module (`hooks/`, `.claude/hooks/`, `.husky/`, `skills/*/assets/`, `skills/*/scripts/`; not config such as `eslint.config.mjs`) has a unit test under `tests/unit/` at the mirrored path, with ≥2 positive and ≥2 negative cases per exported function.
- Unit tests do I/O only through stubbed `deps` per `.claude/rules/es-modules.md` and never touch real fs, git, network, or processes: `grep -rn "node:child_process\|mkdtemp" tests/unit` stays empty (stub keys named `spawn` are fine).
- Behavior that needs real I/O (temp git repos, spawned CLIs, stdin→stdout contracts) goes in `tests/integration/` at the mirrored path. Same `// Arrange`, `// Act`, `// Assert` comments, one Act per test, temp dirs removed in `after`, no network.
- No integration tests in `tests/unit/`; move existing ones with `git mv` so history follows.
- Verify: `npm test` (`test:unit` and `test:integration` run each suite alone).
