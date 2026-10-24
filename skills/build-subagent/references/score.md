# Score

Steps 2, 3, 8–10 of `SKILL.md`: locate, baseline an improve, the check, inline scoring and fixing, validation, the delegation test, and `Open:`. Nothing here spawns an agent.

## Locate

Glob `~/.claude/agents/`, `<repo>/.claude/agents/`, and every plugin `agents/` under the root (recursive) for the agent `name` or path; read each match and note its scope. The same `name` at two scopes is a collision: warn that the higher-precedence one shadows the other (`docs-snapshot.md` `## Scopes and precedence`) and switch to update mode. A named spawner file is read only for `## Contract`.

## Baseline

Improve only: run `check-agent` and score per `## Score and fix`, then report each violation (rubric ID, `file:line`, message) with its concrete fix and the score table; edit nothing yet. That score is `Baseline:` in Output.

## Run the check

- Run `check-agent` from `commands.md` with the agent file and `--scope`. It prints `{ok, errors, warnings}`; exit 0 ok, 1 errors, 2 bad usage (fix the call and re-run once, then `Open:`).
- Each finding has `id`, `rubric`, `file`, `line`, `message`. A warning is not an error, but the score judges it.

## Score and fix

1. Score the agent file against `rubric.md` yourself: full, partial, or zero points per criterion from evidence (`file:line`), criteria marked "S" taken from the check JSON, the total written term by term.
2. Show the score table and deductions, largest first, each with its concrete fix.
3. Fix every deduction with `Edit` on the agent file only, then re-run `check-agent` and rescore. Rules: score 95 or more with `check-agent` passing → stop; a round that changes no file or does not raise the score → stop; at most 3 rounds, shared with Rules. Never edit an agent only to silence a finding, and never invent a fact to gain points.
4. What is left goes to `Open:`.

## Contract

Optional, read-only, only when the user names a spawner file: confirm it passes every input `## Task` reads (C1) and uses only existing Return fields (C2). A mismatch goes to `Open:`; the spawner is never edited. No named file → n/a.

## Validate

Once, after the loop ends: run `validate-agents` on the directory of the agent file, then `debug-log-search` when `claude-version` allows it. A failure goes to `Open:` with no retry; a command that cannot run (no `claude`, older than the gate) → `Not tested: <why>`.

## Delegation test

After validation, when `claude` can run: ask for the task in natural language and by @-mention (`@<name>`, `@<plugin>:<name>`) in a one-line print-mode call, and report whether the right agent was picked and the return matches `## Return`. The agent not loaded (a new plugin agents directory needs a restart), no `claude`, or a write-capable agent (never run for a test) → `Not tested: <why>`.

## Open

`Open:` lists what is left after the cap: remaining `errors` (id, file:line), rubric deductions (ID and fix), unresolved warnings, contract mismatches, and dropped jobs. Facts omitted for lack of a source go to `Unverified:`, not `Open:`. `none` when empty.
