# Commands

`<root>` is the repo root; `<run>` is the absolute `run` value that `init` prints, a directory under `<root>/.cdk-security-audit/`, which `init` makes self-ignoring for git. `<path>` is a repo-relative path prefix.

| Name | Command | Purpose | Exit codes |
| --- | --- | --- | --- |
| `root` | `git rev-parse --show-toplevel` | Repo root (preloaded in Context) | 0 ok; 128 not a repo → stop |
| `init` | `node ${CLAUDE_SKILL_DIR}/scripts/audit-records.mjs init --root <root> [--profile quick\|standard\|deep] [--range <a>..<b>] [<path> ...]` | Create the next `run-<n>` dir and write `scope.json`; prints `run`, `head`, `profile`, `range`, and the `files` and `out_of_scope` counts (the paths are in `scope.json`); a range diffs from the merge base of `<a>` and `<b>` | 0 ok; 1 runtime error (stderr `audit-records: <msg>`), including a run directory not ignored by git → safety stop; 2 usage, including a path matching no tracked file |
| `ledger` | `node ${CLAUDE_SKILL_DIR}/scripts/audit-records.mjs ledger --run <run>` | Check `ledger.json` against `scope.json` (L0 to L5: L0 malformed unit, L1 duplicate id, L2 coverage value, L3 uncovered file, L4 over 40 covered or deferred units, L5 path outside scope) | 0 `ok:true`; 1 `ok:false` with `errors`; 1 runtime error; 2 usage |
| `findings` | `node ${CLAUDE_SKILL_DIR}/scripts/audit-records.mjs findings --run <run>` | Check `findings.json` against `assets/report-schema.json` and rules F1 to F9 | 0 `ok:true`; 1 `ok:false` with `errors`; 1 runtime error; 2 usage |

Exit 1 with `{"ok":false,"errors":[{"rule","id","message"}]}` on stdout from `ledger` or `findings` is a check result, not a stop: fix the named records and run it again. Exit 1 with a single `audit-records: <msg>` line on stderr is a runtime error: stop and report it.
