# Isolate

Step 4 detail. Commands run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`.

## Hypothesis loop

- List 2–5 hypotheses ranked by likelihood, each with the single cheapest experiment that would confirm or rule it out (read a value, add a temporary log, run one narrowed test, `recent-log` and `blame-lines` on the suspect lines).
- Run one experiment at a time and record the result. Remove every temporary log or probe edit before step 6.
- A confirmed hypothesis ends the loop; all ruled out → widen once (callers, config, environment, data), then report `Root cause: not found` with what was excluded.

## Bisect

- Offer `git bisect run` only when the bug is a regression, a known good ref exists, the working tree is clean (Status empty), and the failing test runs unattended. Ask first with `Run bisect (Recommended)` | `Skip bisect`; `--yes` accepts.
- Bisect runs before any probe edit (it needs a clean tree), with a test or command that exists at the older commits (not a test added in step 6); HEAD stays detached until `bisect-reset`.
- Run `bisect-start`, then `bisect-run` with the failing test command. Whatever the outcome, run `bisect-reset` before anything else, and report the first bad commit.
- A mid-run error, a skipped commit, or an interrupted run still ends with `bisect-reset`.

## Research

- An unfamiliar external error (library, framework, tool, or platform message you cannot explain from the code) → spawn `cdk:topic-researcher` once with the exact message, the library and version from the manifest, and the shape `likely causes, with sources`. Treat its answer as hypotheses, not evidence; confirm against the code.
