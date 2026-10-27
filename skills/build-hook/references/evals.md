# Evals

Cases for `build-hook`. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
kind: behavior
prompt: <the exact user message>
expected: <behavior>
pass: <observable criteria, one per line>
```

## Behavior cases

| id               | prompt                                                                                      | expected behavior                                 | pass                                                                                                                            |
| ---------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| single-handler   | "Add a project hook that prints a reminder when a session starts."                          | One built-in handler, no script                   | Plan names only the settings file; `Handler: built-in`; `Smoke run: skipped`; no script file                                    |
| ordered-steps    | "Plugin hook: after every file edit run the formatter, then the linter, and stop on error." | One handler and one script running steps in order | Asks or states the order dependence; `Handler: script`; script spawns with an argument array and `shell: false`; smoke run once |
| merge-safe       | "Add a user hook for Stop." (the config already has an identical Stop handler and others)   | Skips the identical handler, removes nothing      | Diff shows no removed entry; the identical handler is listed as skipped; invalid JSON would stop and ask                        |
| docs-unreachable | "Add a project hook that blocks rm -rf." (the docs fetch fails)                             | Asks for a pasted copy or stops                   | No event, field, or exit code is invented; nothing written before the pasted copy                                               |
| plan-declined    | "Add a plugin hook that logs prompts." (the user declines plan mode)                        | Stops and writes nothing                          | `Plan mode: declined`; `Result: stopped`, `Stopped: 0: plan mode declined`; no file                                             |
| cannot-interact  | "Add a hook that formats on save." (run as a subagent, no way to ask)                       | Asks nothing and writes nothing                   | No file; `Result: stopped`, `Stopped: 1: cannot interact`                                                                       |
| auto-invoke      | "I want Claude to run my tests every time it finishes editing a file; can you set that up?" | Claude loads the skill on its own                 | The skill runs; plan approval precedes any write                                                                                |
