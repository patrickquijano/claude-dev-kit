# Evals

Cases for `setup-graphify`: the main path, the single confirmation, the stop and unattended paths, and the missing-skill fallback. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
kind: behavior
prompt: <the exact user message>
expected: <behavior>
pass: <observable criteria, one per line>
```

## Cases

| id                   | prompt                                                                   | expected behavior                                        | pass                                                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| fresh-setup          | "Set up graphify in this repo." (CLI present, nothing else done)         | Installs skill and hooks, builds the graph, writes rules | One "Apply" or "Stop" question before the first write; no `--strict` or `--force`; `.gitignore` has the three-line block; `.claude/rules/graphify.md` added |
| rerun                | "Set up graphify." (everything already done)                             | Changes nothing                                          | Every step skipped; `Result: nothing-to-do`; no file changed                                                                                                |
| writes-declined      | "Set up graphify." (the user picks Stop at the confirm)                  | Writes nothing                                           | `Stopped: confirm: writes declined`; no hook, skill, or file written                                                                                        |
| no-cli-unattended    | "Set up graphify." (run as a subagent, CLI missing)                      | Never installs globally                                  | Stops at the CLI step; the install is recorded under `Open:`; nothing installed                                                                             |
| graph-skill-missing  | "Set up graphify." (the third-party graph-building skill is unavailable) | Reports the graph as pending                             | Tells the user to run the third-party skill after a restart; `Graph: pending`; later steps still run                                                        |
| existing-ignore-line | "Set up graphify." (`.gitignore` already has a `graphify-out/` line)     | Asks once, keeps it when unattended                      | Interactive: one question about the line; unattended: line kept and recorded under `Open:`                                                                  |
| rules-differ         | "Set up graphify." (the rules file exists and differs)                   | Keeps the user's file                                    | File untouched; `Rules: ... kept (differs)`                                                                                                                 |
| not-a-repo           | "Set up graphify here." (not a git repository)                           | Skips the git steps                                      | Works from the current directory; `Git hooks: skipped (not a git repo)`; no git ignore write                                                                |

## Running per model

Run every case on each model; a case passes only when all its `pass` lines hold. Record failures by id and model.
