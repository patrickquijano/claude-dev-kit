# Flow

Conditional detail for the steps of `SKILL.md`. Commands: `${CLAUDE_SKILL_DIR}/references/commands.md`.

## Contents

- Pre-flight (step 1)
- Stack (step 1)
- Containers (step 2)
- Server setup (steps 4, 5)
- Exclusions (step 6)
- Scan (step 6)
- Brainstorm (step 7)
- Fix (step 8)
- Teardown and cleanup (step 10)

## Pre-flight

- `docker-info` fails → stop (`Docker unavailable`).
- Parse arguments; a bad `max-iterations` (default 3, range 1–5) → use the default and note it in `Arguments:`.
- Run `detect` with `--root <root>`: it returns the project key (`sonar.projectKey` from `sonar-project.properties`, else the sanitized repo directory name), the stack, and the rest used below. Then run `leftover-remove` to clear objects of a crashed run.
- Port: start at 9000; `port-check` exit 0 → try 9001 to 9010. Attended: tell the user which port is used. None free → stop (`no free port 9000-9010`).

## Stack

- `detect` returns `stack` (`cli`, `maven`, or `gradle`), `scanCommand` (`scan-cli`, `scan-maven`, or `scan-gradle`), and `jdk`; the scan runs that stack's scanner image. Record the stack for `Stack:` in the output.
- `stop` set → stop with that reason.
- `ask` = `["maven","gradle"]` (two build tools at the same depth) → attended: AskUserQuestion between them, `maven` first (Recommended); unattended: `maven`. Then use that choice as the stack for the rest of the run.
- `detect` picks the JDK; a compile failure names `jdk` (see Scan).

## Containers

- Tags: run `tags` with `--stack <stack>` and `--jdk <jdk>` (Maven and Gradle); it looks each tag up at most once per day (`source` = `cached` or `looked-up`, for `tags:` in the output). `image tag unresolved` → stop (`image tag unresolved`).
- Run `env-create` (`<envfile>`, mode 600, with `SONAR_PORT`, a generated `SONAR_ADMIN_PASSWORD`, and an empty `SONAR_TOKEN`), then `network-create`.
- Nothing is written under the repo root: the repo is mounted read-only into the scanner, and the secrets live only in `<envfile>`.

## Server setup

- Step 4: `server-run`, then poll `server-status` until `"status":"UP"` (first start takes about a minute). Timeout → stop (`server not ready`; `server-logs` is the evidence).
- Step 5: a fresh server always needs `admin-password-set` (it only accepts `admin`/`admin`), then `token-generate`. Failing → stop (`server setup failed`).

## Exclusions

Use `exclusions` from `detect` as `<exclusions>`, and record `excluded` for `Excluded:`; never add a pattern to hide an issue.

The scanner already skips git-ignored files. Tests are never excluded.

## Scan

- Run `scanCommand` from `detect` (`scan-cli`, `scan-maven`, or `scan-gradle`) with `<exclusions>` and `<key>`.
- The scanner log line `0 files indexed` → stop (`no files analyzed`; the read-only mount failed or every file is excluded). This is a failed scan, never zero issues.
- A failed scan → stop (`scan failed`) with the last log lines. A Maven or Gradle compile failure is a failed scan too; the detected JDK may not match the project's Java version, so name `jdk` in the reason. A failed quality gate is not a failure; the loop runs on issues, not the gate.
- Then run `issues-search` and page it. Record the count per severity and keep every issue in the ledger (see Fix); zero issues, or `i` equal to `max-iterations` → skip to step 10.

## Brainstorm

- Order the ledger by severity (blocker, high, medium, low, info), then rule, then file; sort client-side. Group issues by rule, then by file, at most 8 files per group.
- Per rule once, run `rule-show`; its description is the criterion for a correct fix.
- Spawn one `cdk:codebase-explorer` (kind `triage`) per group, at most 4 per message, each with the issue keys, `path:line`, rule, message, and the rule description; it returns, per issue key, whether the issue is real, the cause, and a fix scoped to that line.
- The main thread reads each `path:line` it relies on, then chooses one approach per group: the smallest change that removes the cause and satisfies the rule description, never a suppression (`// NOSONAR`, `sonar.issue.ignore`) or a weakened test.
- A real-but-risky fix (public API, data contract, behavior change) or a false positive → leave unfixed and list it in `Open:` with evidence; ask nothing.

## Fix

- Ledger: one row per issue key with `rule`, `path:line`, status (`pending`, `applied`, `confirmed`, `open`), and a reason for `open`. Only the rescan sets `confirmed`; `Fixed:` counts `confirmed` rows only.
- Spawn `cdk:plan-implementer` per group with the issue keys, the chosen approach, the rule description, and the exact files and lines it may edit; it touches nothing else. Disjoint-file groups run in one parallel turn, others one at a time.
- Then spawn `cdk:change-verifier` with `kind: checks` to run the repo's documented checks on the changed files, and with `kind: goals` (goals = the group's issue keys and approach) to judge the diff, in one parallel turn: every edit maps to a ledger issue, no unplanned file or line changed, no test weakened. A failing check or an unmapped edit goes back to the implementer once for that group; still failing → revert that group's edit, mark its issues `open`.
- Mark the group's remaining issues `applied`, then `i += 1` and rescan. After the rescan: an `applied` issue absent from the results → `confirmed`; still present → `open` with `fix did not remove the issue`; a key not in the ledger → new `pending` row (a regression or newly visible issue), fixed in the next round.

## Teardown and cleanup

- Run once after the loop ends and on every stop from step 2 onward; a missing container, network, volume, or file is not an error. Never run `git` commands that change the tree.
- Run `teardown` (the server container and its anonymous volumes, the network, and the cache volume), then `env-remove`. Images stay.
- Report each removed item in `Cleanup:`.
