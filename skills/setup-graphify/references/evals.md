# Evals

Cases for `setup-graphify`: the main path, the single plan approval, the stop and unattended paths, and the missing-skill fallback. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
kind: behavior
prompt: <the exact user message>
expected: <behavior>
pass: <observable criteria, one per line>
```

## Cases

| id                   | prompt                                                                   | expected behavior                                        | pass                                                                                                                                                                                     |
| -------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| fresh-setup          | "Set up graphify in this repo." (CLI present, nothing else done)         | Installs skill and hooks, builds the graph, writes rules | No separate Apply or Stop question; `ExitPlanMode` approval before the first write; no `--strict` or `--force`; `.gitignore` has the three-line block; `.claude/rules/graphify.md` added |
| rerun                | "Set up graphify." (everything already done)                             | Changes nothing                                          | Every step skipped; `Result: nothing-to-do`; no file changed                                                                                                                             |
| writes-declined      | "Set up graphify." (the user declines plan mode)                         | Writes nothing                                           | `Stopped: confirm: plan mode declined`; no hook, skill, or file written                                                                                                                  |
| no-cli-unattended    | "Set up graphify." (run as a subagent, CLI missing)                      | Never installs globally                                  | Stops at the CLI step; the install is recorded under `Open:`; nothing installed                                                                                                          |
| graph-skill-missing  | "Set up graphify." (the third-party graph-building skill is unavailable) | Reports the graph as pending                             | Tells the user to run the third-party skill after a restart; `Graph: pending`; later steps still run                                                                                     |
| existing-ignore-line | "Set up graphify." (`.gitignore` already has a `graphify-out/` line)     | Plan replaces it; kept when unattended                   | Interactive: the plan lists the replacement, no question; unattended: line kept and recorded under `Open:`                                                                               |
| rules-differ         | "Set up graphify." (the rules file exists and differs)                   | Keeps the user's file                                    | File untouched; `Rules: ... kept (differs)`                                                                                                                                              |
| not-a-repo           | "Set up graphify here." (not a git repository)                           | Skips the git steps                                      | Works from the current directory; `Git hooks: skipped (not a git repo)`; no git ignore write                                                                                             |
| plan-entered         | "Set up graphify in this repo." (CLI present, nothing else done)         | Plan mode before any write                               | Enters plan mode after pre-flight; plan file listing the planned writes plus `ExitPlanMode` before the first write; no Apply question                                                    |
| plan-declined        | "Set up graphify." (the user declines plan mode)                         | Stops without writing                                    | `Plan mode: declined`, `Result: stopped`, `Stopped: confirm: plan mode declined`; nothing written                                                                                        |

## Running per model

Run every case on each model; a case passes only when all its `pass` lines hold. Record failures by id and model.
