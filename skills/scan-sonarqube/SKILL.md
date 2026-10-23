---
name: scan-sonarqube
description: Sets up SonarQube Community Build and its scanner in Docker, scans the repo, fixes issues, rescans until clean, then tears down. Use only when the user explicitly asks to scan with SonarQube.
argument-hint: '[max-iterations=<n>] [--yes]'
allowed-tools: Bash(git rev-parse *) Bash(docker info *) Bash(node ${CLAUDE_SKILL_DIR}/scripts/sonar-setup.mjs *)
---

# Scan SonarQube

Input: $ARGUMENTS

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

A Context value of `<none>` means that read failed. A missing value or `[shell command execution disabled by policy]` means run that command's `commands.md` row instead.

## Rules

- Rigor: never guess or invent: confirm each path, command, and fact by reading it; ask (unattended: record) what the input and repo cannot answer. Finish every step in full, think twice before each irreversible step, and re-check the result against these rules and the repo's standards before reporting.
- Efficiency: read only what a step needs, keep output terse, and take the fewest steps that meet the goal; when work is autonomous and splits cleanly, spawn independent cdk subagents in one parallel turn (`cdk:task-worker` for read-only work, `cdk:plan-implementer` for edits), never `Explore` or `general-purpose`.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Docker only: the server and scanner run with `docker run` at the exact tags `tags` resolves, looked up at most once per day; never `latest`, never a host install. The repo is mounted read-only; nothing is written under the repo root.
- One scanner per stack: the scanner is the one the detected stack needs (`maven`, `gradle`, or `cli`); an unsupported or undetected stack stops the run, never a guess. Exclude only the stack's generated directories that exist, never to hide an issue.
- Secrets: the admin password and token live only in the temp `<envfile>` (mode 600, outside the repo, deleted at teardown). Never print, quote, commit, or pass them to an agent.
- A scan that fails, times out, or indexes 0 files is never zero issues; report it by its status.
- Fix the cause, never suppress: no `NOSONAR`, no exclusions added to hide an issue, no weakened or deleted tests. Unfixed issues go to `Open:` with a reason.
- Systematic and precise: every issue is a ledger row, handled by severity then rule then file; each edit maps to one issue and the rule's description; an issue counts as fixed only when the rescan no longer reports it.
- Never commit, push, or stash; the user commits afterwards.
- Spawn only `cdk:codebase-explorer` (brainstorm), `cdk:plan-implementer` (fix), and `cdk:change-verifier` (validate); only this skill talks to the user.
- Caps: iterations `max-iterations` (default 3, range 1–5); one retry per failed fix group; at most 4 parallel `cdk:codebase-explorer` spawns per message; server ready within 120 polls.
- Teardown and cleanup: when the loop ends and on every stop from step 2 onward, remove the container, network, and volumes, then `<envfile>`; images stay.
- Unattended (chained or `--yes`): ask nothing and report what is left in `Open:`.

## Workflow

1. **Pre-flight.** Root = Context → Repo root; `<none>` → stop (`not a git repo`). Check Docker, find a free port, then run `detect` for the project key, stack, scanner, JDK, and exclusions, and `leftover-remove`. Detail: `${CLAUDE_SKILL_DIR}/references/flow.md` `## Pre-flight`, `## Stack`.
2. **Containers.** Run `tags`, `env-create`, and `network-create`. Detail: `flow.md` `## Containers`.
3. **Confirm.** Attended: AskUserQuestion Start (Recommended; removes leftover `cdk-sonar-*` containers, network, and volumes, writes a mode-600 secrets file in the temp dir, creates a network, pulls images, starts a container, caches resolved tags under the user cache dir, writes no repo files) | Stop. Unattended: skip.
4. **Start.** `server-run`, then poll `server-status` until `UP`. Detail: `flow.md` `## Server setup`.
5. **Set up.** `admin-password-set`, then `token-generate`. Detail: `flow.md` `## Server setup`.
6. **Scan.** Run the `scanCommand` from `detect` (`scan-cli`, `scan-maven`, or `scan-gradle`) with its `exclusions`, then page `issues-search`; zero issues or `i` = `max-iterations` → step 10. Detail: `flow.md` `## Exclusions`, `## Scan`.
7. **Brainstorm.** Order the issues, read each rule with `rule-show`, spawn `cdk:codebase-explorer` per issue group, then choose one approach per group. Detail: `flow.md` `## Brainstorm`.
8. **Fix.** Spawn `cdk:plan-implementer` per group, then `cdk:change-verifier` against the ledger. Detail: `flow.md` `## Fix`.
9. **Iterate.** Fixes applied → `i += 1`, back to step 6 (server stays up; `i` starts at 0, so the last round is rescanned); else step 10.
10. **Tear down.** Run `teardown`, then `env-remove`: the container, network, and volumes go; images stay. Detail: `flow.md` `## Teardown and cleanup`.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For pre-flight, stack detection, containers, server setup, exclusions, the scan, brainstorming, fixing, and teardown (steps 1, 2, 4–8, 10), see `${CLAUDE_SKILL_DIR}/references/flow.md`.
- For stack and tag work (steps 1, 2), run `${CLAUDE_SKILL_DIR}/scripts/sonar-setup.mjs` through `detect` and `tags` in `commands.md`; never read it.

## Output

```text
Stack: cli | maven | gradle
Server: sonarqube:<tag>; scanner: <image>:<tag>; tags: looked up | cached; port <port>
Excluded: <directory globs> | none
Project: <key>
Arguments: <arg>=<value> invalid, used <default> | valid
Initial: <n> issues (<blocker> blocker, <high> high, <medium> medium, <low> low, <info> info)
Final: <n> issues (<blocker> blocker, <high> high, <medium> medium, <low> low, <info> info)
Fixed: <n confirmed by rescan> | none
Iterations: <k> fix rounds of <max>
Checks: <command: pass | fail | unavailable>, … | none
Teardown: container and network removed | not started
Cleanup: <removed items> | nothing created
Open: <issue key: rule path:line, reason> | none
Next: /cdk:commit-changes | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```

`done` = the loop ended with fixes or with remaining issues listed. `nothing-to-do` = the first scan found zero issues. `stopped` = pre-flight, an unsupported stack, setup, or a failed scan ended the run. `cancelled` = the user chose Stop at step 3.
