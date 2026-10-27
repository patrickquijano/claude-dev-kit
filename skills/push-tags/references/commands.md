# Commands

`<path>`, `<root>`, `<remote>`, `<branch>`, and `<tag>` are literal values, always in single quotes.

| Name             | Command                                                                         | Purpose                                                     | MCP tool |
| ---------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------- | -------- |
| `repo-root`      | `git -C '<path>' rev-parse --show-toplevel`                                     | Repository root; failure = not a repository                 | —        |
| `current-branch` | `git -C '<root>' symbolic-ref --short -q HEAD`                                  | Current branch; failure = detached                          | —        |
| `branch-remote`  | `git -C '<root>' config --get 'branch.<branch>.remote'`                         | Remote the branch tracks; `.` = local                       | —        |
| `remote-url`     | `git -C '<root>' remote get-url '<remote>'`                                     | Remote exists                                               | —        |
| `tag-diff`       | `node "${CLAUDE_SKILL_DIR}/scripts/tag-diff.mjs" '<root>' '<remote>'`           | JSON: `unpushed`, `mismatches`, `remoteTags`, or an error   | —        |
| `push`           | `git -C '<root>' push '<remote>' 'refs/tags/<tag1>' 'refs/tags/<tag2>' …`       | Publish exactly the confirmed tags                          | —        |
