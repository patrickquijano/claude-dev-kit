# Commands

| Name           | Command                                                                                               | Purpose                                                       |
| -------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| `git-root`     | `git rev-parse --show-toplevel`                                                                       | Fails outside a git repo (preloaded in Context)               |
| `existing`     | `git ls-files --cached --others --exclude-standard -- .github/dependabot.yml .github/dependabot.yaml` | Existing config incl. untracked; empty = `<none>` (preloaded) |
| `git-ls-files` | `git ls-files -- <pathspec>...`                                                                       | Tracked manifests per `ecosystems.md`                         |
| `uvx-check`    | `command -v uvx`                                                                                      | Fails when uv is missing                                      |
| `pipx-check`   | `command -v pipx`                                                                                     | Fails when pipx is missing                                    |
| `schema-uvx`   | `uvx check-jsonschema --builtin-schema vendor.dependabot <file>`                                      | Validate against the Dependabot schema                        |
| `schema-pipx`  | `pipx run check-jsonschema --builtin-schema vendor.dependabot <file>`                                 | Same, when only pipx exists                                   |
