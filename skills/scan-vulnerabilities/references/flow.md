# Flow

Conditional detail for the steps of `SKILL.md`. Commands: `${CLAUDE_SKILL_DIR}/references/commands.md`.

## Contents

- Pre-flight (step 1)
- DAST gate (step 2)
- Triage (step 5)
- Remediate (step 6)
- Continue or stop (step 7)
- Ship (step 10)
- Open items (step 11)

## Pre-flight

A merge, rebase, or cherry-pick in progress, or unmerged paths in `status-porcelain`, → stop (`conflicting uncommitted changes`). Parse the arguments; a bad value → use its default, no ask, and note it in `Arguments:`. Create `.vulnerability-reports/<ts>/`. When `check-ignore-reports` fails, append `.vulnerability-reports/` to `.git/info/exclude`; this is local and untracked. Record branch, HEAD, porcelain status, and protected paths in `manifest.json`. Print the data that leaves the machine (`scanners.md` `## Network`). `.specify/` missing → scan and report only, no question (remediation needs Spec Kit; report "run `/cdk:setup-spec-kit` first").

## DAST gate

Check `zap-target`, and `zap-spec` when it is a URL, against `scanners.md` `## OWASP ZAP`. A non-local host, or `zap-mode=api` without `zap-spec` → ZAP `skipped` with that reason, no question. Else AskUserQuestion: I own this non-production target and authorize a passive scan (Recommended) | Skip ZAP. Mode `full` → a second question: Use baseline instead (Recommended) | Run active scan (sends attack payloads to the target). Any unclear ownership → skip ZAP and record why.

## Triage

Non-secret findings: spawn an Explore agent per finding or related group (<=4 per message, batches until done), each with the finding id, `path:line`, and scanner evidence, returning class (confirmed or false-positive with evidence), reachability and exposure as `path:line` (imports, call sites, config use), the resolved version or vulnerable pattern, and a proposed fix; the main thread spot-checks each `path:line` it relies on. For a secret finding, inline: check only that the file is tracked (`tracked-files`) and the fingerprint is current, then mark it `manual` with a rotate-and-move action. Re-score. Classify as `false-positive` (with evidence), `manual` (secret, third-party code, no fix), `needs-approval` (with the boundary named), or remediable. Write each decision to `remediation-log.md`.

## Remediate

For each remediable group, in priority order: checkpoint; invoke `cdk:run-spec-kit` via the Skill tool with the brief from `remediation.md`; check the branch per `remediation.md` `## Branch`; validate. Pass → spawn the agent with `mode=rescan` for that finding; its `Rescan:` says `gone` and `New:` has no finding of equal or higher severity → `fixed`. Still present, or validation failed → diagnose against baseline; then roll back and try once more with a safer approach, or mark it `failed`. Log every attempt in `remediation-log.md` and `manifest.json`, then take the next group. A `stopped` or `cancelled` run-spec-kit fails only that attempt, not the run. After the pass, ask about up to 4 queued `needs-approval` items, one question each: Leave open (Recommended) | Approve fix (names the effect, e.g. "Upgrade x 2 → 3 (breaking)") | Accept risk (logs your justification). Approved fixes run in this same step.

## Continue or stop

Stop the loop when: no confirmed remediable finding is left; only approval-bound, manual, false-positive, or accepted findings are left; a scanner, build, or test dependency needed for reliable validation is unavailable; every remaining remediable finding has used its 2 attempts; `i` = max iterations; or more changes risk regressions (for example, repeated failures across unrelated fixes). Before stopping on approval-bound findings, ask every not-yet-asked `needs-approval` item, 4 per call; an approval with iterations left cancels the stop. No stop condition met → `i += 1`, back to step 4.

## Ship

Fixed count = 0 → skip. Protected paths still dirty → skip, and tell the user that shipping would also commit their earlier uncommitted changes. Else AskUserQuestion, listing the modified files, the `specs/` folders, and the current branch: No PR or MR (Recommended; changes stay uncommitted) | Commit + push + open MR or PR. Ship → current branch is the default branch, or a protected one (`main`, `master`, `develop`, `release/*`, or any the host reports) → invoke `cdk:switch-branch` with `fix vulnerability remediations`; then `cdk:commit-changes`; then `cdk:prepare-change-request --target <default branch> --yes` (default branch = `default-branch` without the `origin/` prefix; it detects the GitHub or GitLab host itself). Any chained `stopped` or `cancelled` → `Stopped: Ship: <its Stopped>`. Each file in its `Excluded:` line → one `Manual actions:` line (held back from commit; review it).

## Open items

Runs after step 10 and once after every stop from step 4 onward (`scanner agent failed`, `redaction image unverified; no scan run`, a `Stopped: Ship` stop); pre-flight stops and cancels skip it. It runs after step 10 so `Manual actions:` includes the held-back files; `Open:` appears in chat output only, not in `summary.md`. It only reports; it never re-runs the loop. Itemize the `Remaining:` count by finding id (`needs-approval`, `manual`, `failed`, `open`) and each failed, pre-existing failed, or unavailable validation command and scanner and failed, unavailable, or skipped scanner, each with impact and recommended fix. Ask nothing again for `needs-approval` items: steps 6 and 7 already offered them.
