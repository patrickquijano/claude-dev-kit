---
paths:
  - '.husky/**'
  - '.commitlintrc.json'
  - '.gitattributes'
  - 'skills/setup-husky/assets/**'
---

# Git hooks

- Hook file (`.husky/<hook>`) POSIX `sh`: no shebang, no `husky.sh` sourcing (deprecated; newer Husky fail on it).
- Hook file only runs `node .husky/<hook>.mjs "$@"`; logic in `.mjs`.
- Hook files stay LF (`.gitattributes` `eol=lf`); CRLF breaks `sh`.
- `.husky/` and `skills/setup-husky/assets/` copies byte-identical; change both together.
- `.mjs` MUST use Node stdlib only, Windows-safe: no shell-only syntax, `spawnSync` with arg arrays.
- One `✅`/`❌` status line per check.
- Exit non-zero only in blocking hooks (e.g. `commit-msg`); `post-commit` can't block → always exit 0.
- `HUSKY=0` skips hooks (CI only; see `git.md`).
- Verify: `node .husky/commit-msg.mjs <msg-file>` prints ✅/❌ lines; exit code matches result.
- Docs: <https://typicode.github.io/husky/>, <https://git-scm.com/docs/githooks>
