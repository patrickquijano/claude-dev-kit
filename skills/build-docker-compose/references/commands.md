# Commands

| Name                   | Command                                                              | Purpose                                                                                                                            |
| ---------------------- | -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `repo-root`            | `git rev-parse --show-toplevel`                                      | Repo root; fail falls back to cwd (preloaded in Context)                                                                           |
| `docker-check`         | `command -v docker`                                                  | Whether docker is installed                                                                                                        |
| `node-check`           | `node --version`                                                     | Node version; compare with the minimum the pinned `dclint` release states                                                          |
| `swarm-state`          | `docker info --format '{{.Swarm.LocalNodeState}}'`                   | Swarm signal: `active` or `inactive`                                                                                               |
| `compose-validate`     | `docker compose -f <file> config --quiet`                            | Plain mode: validate the file; exit 0 ok; never print or log its output (asks for approval: `config` can expose secrets)           |
| `compose-validate-raw` | `docker compose -f <file> config --quiet --no-interpolate`           | Plain mode: validate the structure when `${VAR:?err}` blocks interpolation (asks for approval)                                     |
| `stack-validate`       | `docker stack config -c <file> > /dev/null`                          | Swarm mode: validate the merged file, output discarded; exit 0 ok (asks for approval: the output can expose secrets)               |
| `dclint-version`       | `npm view dclint version`                                            | Latest stable `dclint`, pinned in the next two rows                                                                                |
| `dclint`               | `npx --yes dclint@<version> [--disable-rule <rule>]... <file>`       | Lint the file; errors exit nonzero, warnings fail only past `--max-warnings`; Swarm mode adds the triage rules (asks for approval) |
| `dclint-fix`           | `npx --yes dclint@<version> [--disable-rule <rule>]... --fix <file>` | Apply the auto-fixable findings, then re-run `dclint` (asks for approval)                                                          |
