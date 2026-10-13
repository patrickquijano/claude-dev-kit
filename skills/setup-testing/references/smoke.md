# Smoke

Details step 8 of `${CLAUDE_SKILL_DIR}/SKILL.md`.

- An empty suite is a pass. Runners fail on "no tests found" (pytest exit 5, Playwright, others), so add the flag to the smoke call only, never into a script: `--passWithNoTests` (Jest, Vitest), `--pass-with-no-tests` (Playwright).
- Playwright `--list` also errors with no tests, so run the suite with the flag instead.
- Any other failure (config error, missing browser, failing test) stops the skill: `Stopped: 8: <suite> failed`.
