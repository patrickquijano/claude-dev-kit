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

| id | prompt | expected behavior | pass |
| --- | --- | --- | --- |
| single-handler | "Add a project hook that prints a reminder when a session starts." | One built-in handler, no script | Summary names only the settings file; `Handler: built-in`; `Smoke run: skipped`; no script file |
| ordered-steps | "Plugin hook: after every file edit run the formatter, then the linter, and stop on error." | One handler and one script running steps in order | Asks or states the order dependence; `Handler: script`; script spawns with an argument array and `shell: false`; smoke run once |
| merge-safe | "Add a user hook for Stop." (the config already has an identical Stop handler and others) | Skips the identical handler, removes nothing | The implement-spec brief and the diff show no removed entry; the identical handler is listed as skipped; invalid JSON would stop and ask |
| docs-unreachable | "Add a project hook that blocks rm -rf." (the docs fetch fails) | Asks for a pasted copy or stops | No event, field, or exit code is invented; nothing written before the pasted copy |
| no-approval-step | "Add a plugin hook that logs prompts." | Runs end to end with no approval step and no confirmation; side-effect steps run directly | The only questions are the scope, event, and practices decisions; the diff is printed and the script and config are written through `cdk:implement-spec` in the same turn, with no "Proceed?" prompt and no planner approach question |
| smoke-crash-fix | "Add a project hook that logs prompts." (the script exits 1 on the smoke run) | The crash becomes a finding fixed through `cdk:implement-spec` Fix-round variant, then step 10 re-runs, at most 3 rounds | The smoke-run stderr line is passed as the goal; a second smoke run follows the fix; at most 3 fix rounds; a leftover is listed under `Open:` with no inline write; `BLOCK_ON_FAILURE` is never relaxed |
| smoke-fix-cap | "Add a project hook that logs prompts." (the smoke run still fails after 3 fix rounds) | Stops at the fix cap | The leftover is listed under `Open:`; the output has the exact lines `Result: stopped` and `Stopped: 10: fix cap` |
| user-scope-stop | "Add a hook that logs prompts." (`--yes`, no scope in the input) | Never writes user scope unasked | Scope is Plugin or Project; no file under the home directory is written |
| cannot-interact | "Add a hook that formats on save." (run as a subagent, no way to ask) | Asks nothing and writes nothing | No file; `Result: stopped`, `Stopped: 1: cannot interact` |
| implement-needs-input-stops | "Add a project hook that logs prompts." (`cdk:implement-spec` ends `Stopped: <step>: needs input`) | Stops, never writes inline | `Result: stopped`, `Stopped: <step>: needs input`; no inline write fallback |
| implement-outside-scope-stops | "Add a project hook that logs prompts." (`cdk:implement-spec` ends `Stopped: <step>: write outside scope`) | Stops, never writes inline | `Result: stopped`, `Stopped: <step>: write outside scope`; no inline write fallback |
| implement-cancelled-stops | "Add a project hook that logs prompts." (`cdk:implement-spec` ends `Result: cancelled`) | Stops, keeping implement-spec's reason | `Result: stopped`, `Stopped: <step>: user cancelled`; no inline write fallback |
| auto-invoke | "I want Claude to run my tests every time it finishes editing a file; can you set that up?" | Claude loads the skill on its own | The skill runs; the diff is printed and the files are written through `cdk:implement-spec` with no approval question |
| not-git-hook | "Add a pre-commit Git hook that runs the linter." | Does not load the skill | The skill is not loaded; the request is a Git hook, not a Claude Code hook |
