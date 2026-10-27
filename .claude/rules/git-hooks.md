---
paths:
  - '.husky/**'
  - 'skills/setup-husky/assets/**'
  - '.commitlintrc.json'
  - '.gitattributes'
---

# Git hooks

- Hook file (`.husky/<hook>`) POSIX `sh`: no shebang, no `husky.sh` sourcing (deprecated; newer Husky fail on it).
- `.mjs` MUST use Node stdlib only, Windows-safe: no shell-only syntax, `spawnSync` with arg arrays.
- Exit non-zero only in blocking hooks (e.g. `commit-msg`); `post-commit` can't block (git ignores its status), so it exits 0 except for an unexpected error, which prints one `cdk post-commit:` line and exits 1.
- `HUSKY=0`: see `git.md`.
- Canonical copies live in `skills/setup-husky/assets/`: `.husky/*.mjs` match them byte for byte, stubs differ only in path prefix; change both in the same commit.
- Verify: `node .husky/commit-msg.mjs <msg-file>` prints ✅/❌ lines; exit code matches result; and `cmp .husky/commit-msg.mjs skills/setup-husky/assets/commit-msg.mjs` (same for `post-commit.mjs`).
