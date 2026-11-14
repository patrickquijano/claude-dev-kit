# Commands

| Name | Command | Purpose |
| --- | --- | --- |
| `root` | `git rev-parse --show-toplevel` | Repo root (optional; preloaded in Context) |
| `status` | `git status --porcelain=v1` | Changed paths (optional; preloaded in Context); re-run after the implementer and compare with the baseline |
| `diff-stat` | `git diff --stat` | Show the change set at each change-set check (step 6b) |
| `dirty-diff` | `git diff -- <path>` | Diff of one Dirty path: save at pre-flight (step 1b), compare after each implementer return (step 6b) |
