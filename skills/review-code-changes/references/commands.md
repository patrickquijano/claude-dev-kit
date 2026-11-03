# Commands

`<scratch>` is the `scratch` value that `scope` prints; `<paths>` is a file listing one path per line.

| Name       | Command                                                                                                                  | Purpose                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| `root`     | `git rev-parse --show-toplevel`                                                                                          | Repo root (preloaded in Context)                                                  |
| `status`   | `git status --porcelain=v1`                                                                                              | Changed paths (preloaded in Context)                                              |
| `scope`    | `node ${CLAUDE_SKILL_DIR}/scripts/diff-manifest.mjs scope --root <root>`                                                 | Round-1 manifest JSON and scratch files                                           |
| `verify`   | `node ${CLAUDE_SKILL_DIR}/scripts/diff-manifest.mjs verify --root <root> --scratch <scratch> --paths <paths>`            | Edit-scope check: `ok` false → safety stop                                        |
| `snapshot` | `node ${CLAUDE_SKILL_DIR}/scripts/diff-manifest.mjs snapshot --root <root> --scratch <scratch> --paths <paths>`          | Copy the planned files before a fix                                               |
| `commits`  | `git log --format=%B --no-merges <base>..HEAD`                                                                           | Commit messages for the intent source; `<base>` is the `base` that `scope` prints |
| `delta`    | `node ${CLAUDE_SKILL_DIR}/scripts/diff-manifest.mjs delta --root <root> --scratch <scratch> --paths <paths> --round <n>` | Diff snapshot vs working tree; writes `delta-<n>.*`                               |
