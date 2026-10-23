# Commands

| Name          | Command                                        | Purpose                                                                             |
| ------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------- |
| `repo-root`   | `git rev-parse --show-toplevel`                | Repo root; fail falls back to cwd (preloaded in Context)                            |
| `actionlint`  | `actionlint <workflow files…>`                 | Lint workflows and callees; run by `cdk:practices-reviewer`                         |
| `zizmor`      | `zizmor <.github/workflows> <.github/actions>` | Security audit of workflows and composite actions; run by `cdk:practices-reviewer`  |
| `act-probe`   | `command -v act` and `command -v docker`       | Both must exist for the act check, else it reports `skipped`                        |
| `act-dry-run` | `act -n`                                       | Dry-run every workflow job without executing steps; run by `cdk:practices-reviewer` |
