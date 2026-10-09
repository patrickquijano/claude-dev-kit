---
name: scan-vulnerabilities
description: Scan the repository for security vulnerabilities with pinned, Docker-only free scanners (Semgrep, Trivy, Gitleaks, OSV-Scanner, Checkov, and others, chosen by the detected stack). Consolidate, deduplicate, and prioritize redacted findings. Then loop remediate via cdk:run-spec-kit, validate with the project's builds and tests, roll back failures, and rescan, up to `max-iterations` (default 5). Finish with a full rescan and a before-and-after report in .vulnerability-reports/. Use only when the user explicitly asks to scan for, find, or fix security vulnerabilities, e.g. "scan for vulnerabilities", "run a security scan", "find and fix CVEs", "check for leaked secrets". Do not use on your own after finishing a task.
argument-hint: '[max-iterations=<n>] [image=<ref>]... [zap-target=<local url>] [zap-mode=baseline|api|full] [zap-spec=<openapi path or local url>]'
allowed-tools: Bash(git rev-parse *) Bash(git status *) Bash(git diff *) Bash(git ls-files *) Bash(git check-ignore *) Bash(git stash create) Bash(docker info *) Bash(command -v *)
---

# Scan Vulnerabilities

Input: $ARGUMENTS

## Rules

- User interaction (AskUserQuestion) only here; `cdk:security-scanner` cannot ask. Act on your own for safe, local, non-breaking work. Ask only at an approval boundary below.
- Approval boundaries. Each needs explicit AskUserQuestion approval: breaking dependency upgrades; public API or data-contract changes; database migrations; architectural changes; destructive actions; production access; active DAST; authentication or authorization behavior changes; removing or replacing a major dependency; accepting or suppressing a high or critical finding. Without approval, the finding stays `needs-approval`.
- Scanners: Docker only, at the pinned `image:tag@digest` in `${CLAUDE_SKILL_DIR}/scanners.md`. Never install scanner dependencies on the host. Never add or run linters, formatters, or code-style tools; they are not security evidence. cdk's own format-lint hooks may still fire on edits; list that under validation limitations.
- Secrets: read only redacted reports and the agent's Return, per `${CLAUDE_SKILL_DIR}/reports.md` `## Redaction`. Never read a raw scanner file or the flagged lines of a `secret` finding. Never print, quote, diff-show, commit, or pass a secret value to another skill. Cite file, line, rule, and fingerprint instead. Secret findings are `manual`: Claude cannot edit a line it must not read.
- A failed, timed-out, unavailable, or skipped scan is never zero findings. Report it by its status.
- Verify each finding's applicability before changing code; never apply a scanner recommendation blindly. Exclude only conclusive false positives, logging evidence and justification. A low or medium accepted risk needs logged evidence and justification; a high or critical one needs approval.
- One finding, or one tightly related group (same package, or same rule in the same file), per remediation. Never combine unrelated fixes. Fix rules, checkpoint, validation, and rollback: `${CLAUDE_SKILL_DIR}/remediation.md`.
- Never modify generated, vendored, compiled, minified, or third-party code. Never weaken tests or security controls, delete a failing test, or use a destructive or forceful git command. Never commit or push, except through step 10 after explicit approval.
- Remediate through `cdk:run-spec-kit`, the Build step of `cdk:ship-spec-kit-idea`. Never invoke `cdk:assess-spec-kit-idea` or `cdk:ship-spec-kit-idea`. Chaining: follow `${CLAUDE_SKILL_DIR}/../ship-changes/orchestration.md`; a run-spec-kit `stopped` or `cancelled` fails only that attempt, not the chain.
- Agent spawns pass root, run dir, `iteration`, `mode`, images, the ZAP decision, `${CLAUDE_SKILL_DIR}/scanners.md`, and `${CLAUDE_SKILL_DIR}/reports.md`; rescans add `rescan=<k>`, scanners, changed paths, and finding ids; every spawn adds `retry-used=<scanners>`.
- Statuses carry forward by `F-id`: the skill owns `status`, `attempts`, and `asked` in `manifest.json` `findings`, and writes them after each triage decision, attempt, and approval question (steps 5–7). The agent copies them into each `findings.json`. Only `open` findings are triaged again.
- Never claim the code is secure, bug-free, or free of vulnerabilities. State only what the listed builds, tests, and rescans verified.
- Caps: iterations `max-iterations` (default 5, range 1–10); 2 attempts per finding across all iterations; one agent re-spawn per agent error or missing Return (steps 4, 6, 8), then stop (`scanner agent failed`); a scanner `failed` or `timeout` runs again in the next scan, and after its second failure goes in `retry-used`; approval questions: the top 4 `needs-approval` items by priority per iteration, the rest wait for the next iteration, or for step 7.
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/fallbacks.md`.
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `scan-vulnerabilities`; it covers the agent's `Known issue:` lines.

## Workflow

1. **Pre-flight.** Root = `git rev-parse --show-toplevel`; not a git repo → stop (`no git checkpoint possible`). `docker info` fails → stop (`Docker unavailable; no scan run`). A merge, rebase, or cherry-pick in progress, or unmerged paths in `git status --porcelain` → stop (`conflicting uncommitted changes`). Parse the arguments; a bad value → use its default, no ask, and note it in `Arguments:`. Create `.vulnerability-reports/<ts>/`. When `git check-ignore -q .vulnerability-reports/` fails, append `.vulnerability-reports/` to `.git/info/exclude`; this is local and untracked. Record branch, HEAD, porcelain status, and protected paths in `manifest.json`. Print the data that leaves the machine (`scanners.md` `## Network`). `.specify/` missing → scan and report only, no question (remediation needs Spec Kit; report "run `/cdk:setup-spec-kit` first").
2. **DAST gate.** Only when `zap-target` is given. Check `zap-target`, and `zap-spec` when it is a URL, against `scanners.md` `## OWASP ZAP`. A non-local host, or `zap-mode=api` without `zap-spec` → ZAP `skipped` with that reason, no question. Else AskUserQuestion: I own this non-production target and authorize a passive scan (Recommended) | Skip ZAP. Mode `full` → a second question: Use baseline instead (Recommended) | Run active scan (sends attack payloads to the target). Any unclear ownership → skip ZAP and record why.
3. **Baseline.** Detect and run the validation commands per `remediation.md` `## Validation commands`. Record pass, fail, or unavailable. When build and every test command are unavailable → scan only, with stop reason `validation unavailable`.
4. **Scan.** Iteration `i` (starts at 1): spawn `cdk:security-scanner` with `mode=full`. Copy its scan records and counts into `manifest.json`.
5. **Triage.** Read `iteration-<i>/findings.json`; take open findings in priority order. For each non-secret finding: read the cited code or manifest, confirm the resolved version or the vulnerable pattern, check reachability (imports, call sites, config use), and check exposure. For a secret finding: check only that the file is tracked (`git ls-files`) and the fingerprint is current, then mark it `manual` with a rotate-and-move action. Re-score. Classify as `false-positive` (with evidence), `manual` (secret, third-party code, no fix), `needs-approval` (with the boundary named), or remediable. Write each decision to `remediation-log.md`.
6. **Remediate.** Take remediable groups in priority order. For each: checkpoint; invoke the `cdk:run-spec-kit` skill via the Skill tool with the brief from `remediation.md`; check the branch per `remediation.md` `## Branch`; validate. Pass → spawn the agent with `mode=rescan` for that finding; its `Rescan:` says `gone` and `New:` has no finding of equal or higher severity → `fixed`. Still present, or validation failed → diagnose against baseline; then roll back and try once more with a safer approach, or mark it `failed`. Log every attempt in `remediation-log.md` and `manifest.json`, then take the next group. After the pass, ask about up to 4 queued `needs-approval` items, one question each: Leave open (Recommended) | Approve fix (names the effect, e.g. "Upgrade x 2 → 3 (breaking)") | Accept risk (logs your justification). Approved fixes run in this same step.
7. **Continue or stop.** Stop the loop when: no confirmed remediable finding is left; only approval-bound, manual, false-positive, or accepted findings are left; a scanner, build, or test dependency needed for reliable validation is unavailable; every remaining remediable finding has used its 2 attempts; `i` = max iterations; or more changes risk regressions (for example, repeated failures across unrelated fixes). Before stopping on approval-bound findings, ask every not-yet-asked `needs-approval` item, 4 per call; an approval with iterations left cancels the stop. No stop condition met → `i += 1`, back to step 4.
8. **Final rescan.** Spawn the agent with `mode=final` as iteration `i + 1`.
9. **Report.** Write `summary.md` per `reports.md` `## summary.md`, and finalize `manifest.json` `result`. Initial counts come from iteration 1, final counts from the final rescan. Remove the `cdk-vuln-scan/*` image tags this run built.
10. **Ship.** Fixed count = 0 → skip. Protected paths still dirty → skip, and tell the user that shipping would also commit their earlier uncommitted changes. Else AskUserQuestion, listing the modified files, the `specs/` folders, and the current branch: Leave changes uncommitted (Recommended; review the diff first) | Commit + push + open MR or PR via cdk:ship-changes. Ship → invoke the `cdk:ship-changes` skill via the Skill tool with `fix vulnerability remediations`; its `stopped` or ship-changes `cancelled` → `Stopped: Ship: <its Stopped>`. Each file in its `Excluded:` line → one `Manual actions:` line (held back from commit; review it).

## Output

```text
Run: .vulnerability-reports/<ts>/
Arguments: <arg>=<value> invalid, used <default>, … | valid
Stack: <languages; dependency ecosystems; IaC; kubernetes yes|no; images; web target | none>
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
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```

`done` = the loop or a scan-only run ended on a step 7 condition, `validation unavailable`, or a scan-only run because `.specify/` is missing. `nothing-to-do` = every scanner completed with zero findings. `stopped` = pre-flight or an agent failure ended the run early. `cancelled` = ship-changes cancelled. A ship-changes `stopped` sets `stopped`.
