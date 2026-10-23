# Commands

| Name           | Command                                | Purpose                                        |
| -------------- | -------------------------------------- | ---------------------------------------------- |
| `root`         | `git rev-parse --show-toplevel`        | Repo root (preloaded in Context)               |
| `branch`       | `git rev-parse --abbrev-ref HEAD`      | Current branch (preloaded in Context)          |
| `status`       | `git status --porcelain=v1`            | Changed paths (preloaded in Context)           |
| `recent-log`   | `git log --oneline -n 20 -- <path>`    | Recent commits touching a suspect path         |
| `blame-lines`  | `git blame -L <start>,<end> -- <path>` | Who last changed the suspect lines             |
| `diff-file`    | `git diff -- <path>`                   | Baseline of a file before this run edits it    |
| `show-file`    | `git show <ref>:<path>`                | File content at a ref (suspect history)        |
| `bisect-start` | `git bisect start <bad> <good>`        | Begin a bisect between a bad and a good ref    |
| `bisect-run`   | `git bisect run <test command>`        | Let the failing test find the first bad commit |
| `bisect-reset` | `git bisect reset`                     | End the bisect and return to the original ref  |
