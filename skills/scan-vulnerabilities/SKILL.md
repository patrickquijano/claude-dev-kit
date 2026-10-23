---
name: scan-vulnerabilities
description: Scans the repo for vulnerabilities with free Docker scanners, remediates, validates, rescans, and reports before and after. Use only when the user explicitly asks to scan for or fix vulnerabilities.
argument-hint: '[max-iterations=<n>] [image=<ref>]... [zap-target=<local url>] [zap-mode=baseline|api|full] [zap-spec=<openapi path or local url>] [--yes]'
allowed-tools: Bash(git rev-parse *) Bash(git remote get-url *) Bash(git symbolic-ref --short refs/remotes/origin/HEAD) Bash(git status *) Bash(git diff *) Bash(git ls-files *) Bash(git check-ignore *) Bash(git stash create) Bash(docker info *) Bash(command -v *)
---

# Scan Vulnerabilities

Input: $ARGUMENTS

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

A Context value of `<none>` means that read failed. A missing value or `[shell command execution disabled by policy]` means run that command's `commands.md` row instead.

## Rules

- Rigor: never guess or invent: confirm each path, command, and fact by reading it; ask (unattended: record) what the input and repo cannot answer. Finish every step in full, think twice before each irreversible step, and re-check the result against these rules and the repo's standards before reporting.
- Efficiency: read only what a step needs, keep output terse, and take the fewest steps that meet the goal; when work is autonomous and splits cleanly, spawn independent cdk subagents in one parallel turn (`cdk:task-worker` for read-only work, `cdk:plan-implementer` for edits), never `Explore` or `general-purpose`; each spawn gets a complete brief (agent, kind, literal inputs, scope, return block; missing or ambiguous → `Question:`, never assume).
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- User interaction (AskUserQuestion) only here; `cdk:security-scanner` cannot ask. Act on your own for safe, local, non-breaking work. Ask only at an approval boundary below.
- Approval boundaries. Each needs explicit AskUserQuestion approval: breaking dependency upgrades; public API or data-contract changes; database migrations; architectural changes; destructive actions; production access; active DAST; authentication or authorization behavior changes; removing or replacing a major dependency; accepting or suppressing a high or critical finding. Without approval, the finding stays `needs-approval`.
- Scanners: Docker only, at the latest stable release within each scanner's verified major, resolved and digest-locked per run per `${CLAUDE_SKILL_DIR}/references/scanners.md` `## Image resolution`; never a prerelease, `latest`, or an earlier run's version. An unverifiable version → that scanner is `unavailable`. Never install scanner dependencies on the host. Never add or run linters, formatters, or code-style tools; they are not security evidence. cdk's own format-lint hooks may still fire on edits; list that under validation limitations.
- Secrets: read only redacted reports and the agent's Return, per `${CLAUDE_SKILL_DIR}/references/reports.md` `## Redaction`. Never read a raw scanner file or the flagged lines of a `secret` finding. Never print, quote, diff-show, commit, or pass a secret value to another skill. Cite file, line, rule, and fingerprint instead. Secret findings are `manual`: Claude cannot edit a line it must not read.
- A failed, timed-out, unavailable, or skipped scan is never zero findings. Report it by its status.
- Verify each finding's applicability before changing code; never apply a scanner recommendation blindly. Exclude only conclusive false positives, logging evidence and justification. A low or medium accepted risk needs logged evidence and justification; a high or critical one needs approval.
- One finding, or one tightly related group (same package, or same rule in the same file), per remediation. Never combine unrelated fixes. Fix rules, checkpoint, validation, and rollback: `${CLAUDE_SKILL_DIR}/references/remediation.md`.
- Never modify generated, vendored, compiled, minified, or third-party code. Never weaken tests or security controls, delete a failing test, or use a destructive or forceful git command. Never commit or push, except through step 10 after explicit approval (Commit + push + open MR or PR).
- Remediate through `cdk:run-spec-kit`, as its build step. Never invoke `cdk:assess-spec-kit-idea`. Chain skills through the Skill tool in this main thread, never the Agent tool and never `context: fork`; invoking this skill is the user's request for each chained skill. A run-spec-kit `stopped` or `cancelled` fails only that attempt; a chained `stopped` or `cancelled` in step 10 ends the run.
- Agent spawns (briefs: `flow.md` `## Spawn briefs`) pass root, run dir, `iteration`, `mode`, images, the ZAP decision, `${CLAUDE_SKILL_DIR}/references/scanners.md`, and `${CLAUDE_SKILL_DIR}/references/reports.md`; rescans add `rescan=<k>`, scanners, changed paths, and finding ids; every spawn adds `retry-used=<scanners>`.
- Statuses carry forward by `F-id`: the skill owns `status`, `attempts`, and `asked` in `manifest.json` `findings`, and writes them after each triage decision, attempt, and approval question (steps 5–7). The agent copies them into each `findings.json`. Only `open` findings are triaged again.
- Never claim the code is secure, bug-free, or free of vulnerabilities. State only what the listed builds, tests, and rescans verified.
- Caps: iterations `max-iterations` (default 5, range 1–10); 2 attempts per finding across all iterations; one agent re-spawn per agent error or missing Return (steps 4, 6, 8), then stop (`scanner agent failed`); a scanner `failed` or `timeout` runs again in the next scan, and after its second failure goes in `retry-used`; triage `cdk:codebase-explorer` spawns <=4 per message; approval questions: the top 4 `needs-approval` items by priority per iteration, the rest wait for the next iteration, or for step 7.
- AskUserQuestion unavailable: ask the pending question as plain text with its options, end the turn, and take the next message as the answer. Never report a result in place of a pending question.
- Cleanup: `raw-cleanup` (the raw dir path is saved in `<run dir>/.raw-path`) runs after each scanner run and when the skill stops, on any stop reason from step 4 onward; `container-remove` runs only after a scanner timeout and when the skill stops (a missing container is ignored).
- Unattended (chained or `--yes`): ask nothing; ZAP is skipped (step 2), shipping is skipped (step 10), and approval-bound items stay `needs-approval`; all are listed in `Open:`.
- Open items: step 11 runs once, only reports, and never re-enters the loop; leftovers go in `Open:` before `Result:`.

## Workflow

1. **Pre-flight.** Root = Context → Repo root; `<none>` (not a git repo) → stop (`no git checkpoint possible`). `docker-info` fails → stop (`Docker unavailable; no scan run`). Then the conflict check, argument parsing, run dir, manifest, and `.specify/` check. Detail: `${CLAUDE_SKILL_DIR}/references/flow.md` `## Pre-flight`.
2. **DAST gate.** Only when `zap-target` is given: unattended, a non-local host, or `zap-mode=api` without `zap-spec` → ZAP `skipped`, no question; else ask. Detail: `flow.md` `## DAST gate`.
3. **Baseline.** Detect and run the validation commands per `remediation.md` `## Validation commands`. Record pass, fail, or unavailable. When build and every test command are unavailable → scan only, with stop reason `validation unavailable`.
4. **Scan.** Iteration `i` (starts at 1): spawn `cdk:security-scanner` with `mode=full`. Copy its scan records and counts into `manifest.json`. Store its `Newer major:` line in `manifest.json`. Its `Images:` (informational except for jq) or `Scans:` line shows jq `unavailable` or unverified, in any iteration → stop (`redaction image unverified; no scan run`).
5. **Triage.** Read `iteration-<i>/findings.json`; take open findings in priority order; confirm each, then classify `false-positive`, `manual`, `needs-approval`, or remediable and write it to `remediation-log.md`. Detail: `flow.md` `## Triage`.
6. **Remediate.** Per remediable group in priority order: checkpoint, invoke `cdk:run-spec-kit`, validate, rescan with `mode=rescan`; a failure rolls back and retries once, or marks it `failed`. Then ask about up to 4 queued `needs-approval` items. Detail: `flow.md` `## Remediate`.
7. **Continue or stop.** Stop when no confirmed remediable finding is left, `i` = max iterations, or another listed condition holds; else `i += 1`, back to step 4. Detail: `flow.md` `## Continue or stop`.
8. **Final rescan.** Spawn the agent with `mode=final` as iteration `i + 1`.
9. **Report.** Write `summary.md` per `reports.md` `## summary.md`, and finalize `manifest.json` `result`. Initial counts come from iteration 1, final counts from the final rescan. Remove the `cdk-vuln-scan/*` image tags this run built (`image-remove`). Carry the `Newer major:` line stored in step 4 into the Output.
10. **Ship.** Fixed count = 0, unattended, or protected paths still dirty → skip; else ask, then chain `cdk:switch-branch`, `cdk:commit-changes`, and `cdk:prepare-change-request --target <default branch> --yes`. Detail: `flow.md` `## Ship`.
11. **Open items.** After step 10 and once after every stop from step 4 onward; it only reports. Detail: `flow.md` `## Open items`.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For pre-flight, the DAST gate, triage, the remediation pass, loop stops, shipping, and open items (steps 1, 2, 5, 6, 7, 10, 11), see `${CLAUDE_SKILL_DIR}/references/flow.md`.
- For validation commands, checkpoint, the run-spec-kit brief, fix rules, rollback, and attempts (steps 3, 6), see `${CLAUDE_SKILL_DIR}/references/remediation.md`.
- For images, detection, applicability, command templates, network, ZAP, and exit codes, see `${CLAUDE_SKILL_DIR}/references/scanners.md`; it is also passed to `cdk:security-scanner`.
- For the report layout, redaction, finding schema, manifest, and `summary.md` (steps 4, 9), see `${CLAUDE_SKILL_DIR}/references/reports.md`; it is also passed to `cdk:security-scanner`.

## Output

```text
Run: .vulnerability-reports/<ts>/
Arguments: <arg>=<value> invalid, used <default>, … | valid
Stack: <languages; dependency ecosystems; IaC; kubernetes yes|no; images; web target | none>
Newer major: <scanner version (verified <major>)>, … | none
Scanners: <scanner version: ok | findings | failed | timeout | unavailable | skipped (reason)>, …
Initial: <critical> critical, <high> high, <medium> medium, <low> low, <info+unknown> other
Final: <critical> critical, <high> high, <medium> medium, <low> low, <info+unknown> other
Fixed: <n> (<F-ids>) | none
Remaining: <n> (<needs-approval a, manual b, failed c, open d>) | none
False positives: <n> | none
Accepted risks: <n> | none
Validation: <command: pass | fail | pre-existing fail | unavailable>, …
Manual actions: <one per line, e.g. rotate credential> | none
Branches: <branch at start> → <branch now>; created: <names> | unchanged
Iterations: <k> of <max>
Stop reason: <condition from step 7, or the pre-flight reason>
MR: !<iid> <url> | PR: #<n> <url> | none
Open: <id: severity, reason; recommended fix>, … | none
Next: /cdk:prepare-change-request | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```

`done` = the loop or a scan-only run ended on a step 7 condition, `validation unavailable`, or a scan-only run because `.specify/` is missing. `nothing-to-do` = every scanner completed with zero findings. `stopped` = pre-flight or an agent failure ended the run early. `cancelled` = any skill chained in step 10 cancelled. A chained `stopped` sets `stopped`.
