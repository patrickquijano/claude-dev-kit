---
name: scan-vulnerabilities
description: Scan the repository for security vulnerabilities with Docker-only free scanners chosen by stack, then remediate via cdk:run-spec-kit, validate, roll back failures, and rescan, with a before-and-after report. Use only when the user explicitly asks to scan for or fix security vulnerabilities, e.g. "run a security scan". Do not use on your own after finishing a task.
argument-hint: '[max-iterations=<n>] [image=<ref>]... [zap-target=<local url>] [zap-mode=baseline|api|full] [zap-spec=<openapi path or local url>]'
allowed-tools: Bash(git rev-parse *) Bash(git remote get-url *) Bash(git symbolic-ref --short refs/remotes/origin/HEAD) Bash(git status *) Bash(git diff *) Bash(git ls-files *) Bash(git check-ignore *) Bash(git stash create) Bash(docker info *) Bash(command -v *)
---

# Scan Vulnerabilities

Input: $ARGUMENTS

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

A Context value of `<none>` means that read failed. A missing value or `[shell command execution disabled by policy]` means run that command's `commands.md` row instead.

## Rules

- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- User interaction (AskUserQuestion) only here; `cdk:security-scanner` cannot ask. Act on your own for safe, local, non-breaking work. Ask only at an approval boundary below.
- Approval boundaries. Each needs explicit AskUserQuestion approval: breaking dependency upgrades; public API or data-contract changes; database migrations; architectural changes; destructive actions; production access; active DAST; authentication or authorization behavior changes; removing or replacing a major dependency; accepting or suppressing a high or critical finding. Without approval, the finding stays `needs-approval`.
- Scanners: Docker only, at the latest stable release within each scanner's verified major, resolved and digest-locked per run per `${CLAUDE_SKILL_DIR}/references/scanners.md` `## Image resolution`; never a prerelease, `latest`, or an earlier run's version. An unverifiable version → that scanner is `unavailable`. Never install scanner dependencies on the host. Never add or run linters, formatters, or code-style tools; they are not security evidence. cdk's own format-lint hooks may still fire on edits; list that under validation limitations.
- Secrets: read only redacted reports and the agent's Return, per `${CLAUDE_SKILL_DIR}/references/reports.md` `## Redaction`. Never read a raw scanner file or the flagged lines of a `secret` finding. Never print, quote, diff-show, commit, or pass a secret value to another skill. Cite file, line, rule, and fingerprint instead. Secret findings are `manual`: Claude cannot edit a line it must not read.
- A failed, timed-out, unavailable, or skipped scan is never zero findings. Report it by its status.
- Verify each finding's applicability before changing code; never apply a scanner recommendation blindly. Exclude only conclusive false positives, logging evidence and justification. A low or medium accepted risk needs logged evidence and justification; a high or critical one needs approval.
- One finding, or one tightly related group (same package, or same rule in the same file), per remediation. Never combine unrelated fixes. Fix rules, checkpoint, validation, and rollback: `${CLAUDE_SKILL_DIR}/references/remediation.md`.
- Never modify generated, vendored, compiled, minified, or third-party code. Never weaken tests or security controls, delete a failing test, or use a destructive or forceful git command. Never commit or push, except through step 10 after explicit approval.
- Remediate through `cdk:run-spec-kit`, as its build step. Never invoke `cdk:assess-spec-kit-idea`. Chaining: follow `${CLAUDE_SKILL_DIR}/../build-skill/references/orchestration.md`; a run-spec-kit `stopped` or `cancelled` fails only that attempt, not the chain.
- Agent spawns pass root, run dir, `iteration`, `mode`, images, the ZAP decision, `${CLAUDE_SKILL_DIR}/references/scanners.md`, and `${CLAUDE_SKILL_DIR}/references/reports.md`; rescans add `rescan=<k>`, scanners, changed paths, and finding ids; every spawn adds `retry-used=<scanners>`.
- Statuses carry forward by `F-id`: the skill owns `status`, `attempts`, and `asked` in `manifest.json` `findings`, and writes them after each triage decision, attempt, and approval question (steps 5–7). The agent copies them into each `findings.json`. Only `open` findings are triaged again.
- Never claim the code is secure, bug-free, or free of vulnerabilities. State only what the listed builds, tests, and rescans verified.
- Caps: iterations `max-iterations` (default 5, range 1–10); 2 attempts per finding across all iterations; one agent re-spawn per agent error or missing Return (steps 4, 6, 8), then stop (`scanner agent failed`); a scanner `failed` or `timeout` runs again in the next scan, and after its second failure goes in `retry-used`; approval questions: the top 4 `needs-approval` items by priority per iteration, the rest wait for the next iteration, or for step 7.
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/references/fallbacks.md`.
- Final step: follow `${CLAUDE_SKILL_DIR}/../build-skill/references/resolve-findings.md` (scope: ask-only; sources: `Remaining:` items itemized, `Validation:` fail|pre-existing fail|unavailable, failed|unavailable|skipped `Scanners:`, `Manual actions:`).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/references/known-issues.md` with slug `scan-vulnerabilities` and store `${CLAUDE_PLUGIN_DATA}/known-issues`; it covers the agent's `Known issue:` lines.

## Workflow

1. **Pre-flight.** Root = Context → Repo root; `<none>` (not a git repo) → stop (`no git checkpoint possible`). `docker-info` fails → stop (`Docker unavailable; no scan run`). Then the conflict check, argument parsing, run dir, manifest, and `.specify/` check. Detail: `${CLAUDE_SKILL_DIR}/references/preflight.md`.
2. **DAST gate.** Only when `zap-target` is given: a non-local host, or `zap-mode=api` without `zap-spec` → ZAP `skipped`, no question; else ask. Detail: `${CLAUDE_SKILL_DIR}/references/dast.md`.
3. **Baseline.** Detect and run the validation commands per `remediation.md` `## Validation commands`. Record pass, fail, or unavailable. When build and every test command are unavailable → scan only, with stop reason `validation unavailable`.
4. **Scan.** Iteration `i` (starts at 1): spawn `cdk:security-scanner` with `mode=full`. Copy its scan records and counts into `manifest.json`. Store its `Newer major:` line in `manifest.json`. Its `Images:` (informational except for jq) or `Scans:` line shows jq `unavailable` or unverified, in any iteration → stop (`redaction image unverified; no scan run`).
5. **Triage.** Read `iteration-<i>/findings.json`; take open findings in priority order; confirm each, then classify `false-positive`, `manual`, `needs-approval`, or remediable and write it to `remediation-log.md`. Detail: `${CLAUDE_SKILL_DIR}/references/triage.md`.
6. **Remediate.** Per remediable group in priority order: checkpoint, invoke `cdk:run-spec-kit`, validate, rescan with `mode=rescan`; a failure rolls back and retries once, or marks it `failed`. Then ask about up to 4 queued `needs-approval` items. Detail: `${CLAUDE_SKILL_DIR}/references/remediation-loop.md`.
7. **Continue or stop.** Stop when no confirmed remediable finding is left, `i` = max iterations, or another listed condition holds; else `i += 1`, back to step 4. Detail: `${CLAUDE_SKILL_DIR}/references/loop-control.md`.
8. **Final rescan.** Spawn the agent with `mode=final` as iteration `i + 1`.
9. **Report.** Write `summary.md` per `reports.md` `## summary.md`, and finalize `manifest.json` `result`. Initial counts come from iteration 1, final counts from the final rescan. Remove the `cdk-vuln-scan/*` image tags this run built. Carry the `Newer major:` line stored in step 4 into the Output.
10. **Ship.** Fixed count = 0 or protected paths still dirty → skip; else ask, then chain `cdk:switch-branch`, `cdk:commit-changes`, and `cdk:prepare-change-request --target <default branch> --yes`. Detail: `${CLAUDE_SKILL_DIR}/references/ship.md`.
11. **Resolve findings.** Per resolve-findings.md, after step 10 and once after every stop from step 4 onward; it only reports. Detail: `${CLAUDE_SKILL_DIR}/references/resolution.md`.

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
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```

`done` = the loop or a scan-only run ended on a step 7 condition, `validation unavailable`, or a scan-only run because `.specify/` is missing. `nothing-to-do` = every scanner completed with zero findings. `stopped` = pre-flight or an agent failure ended the run early. `cancelled` = any skill chained in step 10 cancelled. A chained `stopped` sets `stopped`.
