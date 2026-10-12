# Commands

| Name                 | Command                                    | Purpose                      |
| -------------------- | ------------------------------------------ | ---------------------------- |
| `repo-root`          | `git rev-parse --show-toplevel`            | Project root                 |
| `node-version`       | `node --version`                           | Node.js available            |
| `node-check`         | `node --check .claude/hooks/run-tests.mjs` | Syntax-check the hook script |
| `status-porcelain`   | `git status --porcelain`                   | Files the suites write       |
| `check-ignore-tasks` | `git check-ignore -q .vscode/tasks.json`   | Tasks file is ignored        |
