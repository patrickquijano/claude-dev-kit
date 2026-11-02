# Verify

Steps 2, 4, 9–11 of `SKILL.md`: locate, baseline an improve, the check, validation, the delegation test, and `Open:`. Scoring and score-driven fixes belong to the `cdk:audit-subagent` skill, invoked in step 9.

## Locate

Glob `~/.claude/agents/`, `<repo>/.claude/agents/`, and every plugin `agents/` under the root (recursive) for the agent `name` or path; read each match and note its scope. The same `name` at two scopes is a collision: warn that the higher-precedence one shadows the other (`docs-snapshot.md` `## Scopes and precedence`) and ask which file to update; step 4 picks the mode.

## Baseline

Improve only: run `check-agent` and report each violation (rubric ID, `file:line`, message) with its concrete fix; edit nothing yet. That result is `Baseline:` in Output.

## Run the check

- Run `check-agent` from `commands.md` with the agent file and `--scope`. It prints `{ok, errors, warnings}`; exit 0 ok, 1 errors, 2 bad usage (fix the call and re-run once, then `Open:`).
- Each finding has `id`, `rubric`, `file`, `line`, `message`. A warning is not an error, but the audit judges it.
- No `node`, or the script cannot run → `Checks: check-agent not run`, `Not tested: check-agent (no node)`; the audit judges the mechanical criteria by hand.

## Validate

Once, after the loop ends: run `validate-agents` on the nearest ancestor directory named `agents` (the agent file's own directory when it is named `agents`), then `debug-log-search`. A failure goes to `Open:` with no retry; a command that cannot run (no `claude`) → `Not tested: <why>`.

## Delegation test

After validation, when `claude` can run: take the sample task from interview item 5 (Triggers), no trigger recorded → `Not tested: no sample task`; ask for it in natural language and by @-mention (`@<name>`, `@<plugin>:<name>`) with `delegation-test`, and report whether the right agent was picked and the return matches `## Return`; a wrong pick or a Return mismatch goes to `Open:`. The agent not loaded (a new plugin agents directory needs a restart), no `claude`, or a write-capable agent (never run for a test) → `Not tested: <why>`.

## Open

`Open:` lists what is left after the cap: remaining `errors` (id, file:line), the audit's `Open:` items, unresolved warnings, and dropped jobs. Facts omitted for lack of a source go to `Unverified:`, not `Open:`. `none` when empty.
