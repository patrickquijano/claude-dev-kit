# Validate

Detail for steps 8–9.

## Find the checks

1. CLAUDE.md `Commands` (and `.claude/rules/` files that name a verify command).
2. Manifest scripts (`package.json`, `composer.json`, `Makefile`, `pyproject.toml`, and the like).
3. Neither has a command for a kind → record it as `skipped (no documented command)`; never invent one.

Run in this order: the new or changed tests, lint, type check, the full test suite, build. Use check mode where the project has one.

## Fix

- Fix every error and warning in files this run changed; up to 3 attempts per pass, re-running the failed command each time.
- A failure in a file this run did not change → do not fix it; list it under `Open:` with the evidence.
- Never weaken, skip, or delete a test to get green.

## Evidence

Mark each goal `met` or `unmet` with the proof that settles it:

```text
G1: met — <test path> passes | <command> output | <observed behavior>
G2: unmet — <what failed, file:line>
```

Run `diff-stat` to confirm the change set matches the approach; an unplanned file is reverted or justified.

## Iterate

- Re-enter step 5 when a goal is unmet or a check still fails after its fix attempts, passing along the evidence.
- Count each re-entry as a round; round 3 ending with a gap stops the loop.
- Unattended runs re-enter without asking.

## Open

List what is left as `<id: severity, reason; recommended fix>`: unmet goals, failed or skipped checks, assumptions made under `--yes`, and failures outside this run's files.
