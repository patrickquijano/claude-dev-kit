# Reports

Shared by `cdk:scan-vulnerabilities` and `cdk:security-scanner`. `<ts>` = run start, `date -u +%Y%m%dT%H%M%SZ`.

## Layout

```text
.vulnerability-reports/
  .cache/trivy/                    # trivy DB cache, reused across runs
  <ts>/
    manifest.json                  # machine-readable run record (skill owns it)
    scanner-images.json            # resolved image, tag, digest per scanner, written once per run (agent writes)
    summary.md                     # before-and-after summary (skill owns it)
    remediation-log.md             # one entry per triage decision and remediation (skill owns it)
    iteration-<n>/
      scans.json                   # this iteration's scan records (agent writes)
      findings.json                # consolidated, deduplicated, redacted findings (agent writes)
      <scanner>/
        <scanner>.log              # redacted terminal log
        <scanner>*.json            # projected (allow-listed) reports
        rescan-<k>/                # targeted rescans after a remediation, same contents
```

The final rescan is the last `iteration-<n>` and has `"kind": "final"`. The skill adds `.vulnerability-reports/` to `.git/info/exclude`, so reports are never committed.

## Redaction

Secret values must never reach a report, log, prompt, diff, commit, or console.

1. Scanners write only to `$RAW` (a `mktemp -d` dir outside the repo). Nobody reads, cats, greps, or prints a `$RAW` file. The one exception is a key-path listing, which shows structure but no values: `jq '[paths | map(tostring) | join(".")] | unique'`.
2. Project each raw JSON report into the run dir with the resolved jq image (`--network none`). Keep only the allow-listed fields below and drop everything else, so an unknown field cannot carry a value through. The jq program reads the file; Claude never does:

   ```bash
   docker run --rm -i --network none "$JQ" '<projection>' \
     < "$RAW/<scanner>/<file>" > "$RUN/iteration-<n>/<scanner>/<file>"
   ```

   | Scanner     | Keep (starting paths; confirm with the key-path listing)                                                                                                                                                                                                                                                                                                |
   | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
   | semgrep     | `.results[]`: `check_id`, `path`, `start.line`, `end.line`, `extra.severity`, `extra.metadata.{category,confidence,impact,likelihood,cwe,owasp}`. `.errors[]`: `type`, `level`. Drop `extra.message`, which interpolates matched values.                                                                                                                |
   | trivy       | `.Results[]`: `Target`, `Class`, `Type`. `Vulnerabilities[]`: `VulnerabilityID`, `PkgName`, `PkgID`, `InstalledVersion`, `FixedVersion`, `Severity`, `Title`. `Misconfigurations[]`: `ID`, `AVDID`, `Status`, `Severity`, `Title`, `CauseMetadata.{Resource,StartLine,EndLine}`. `Secrets[]`: `RuleID`, `Category`, `Severity`, `StartLine`, `EndLine`. |
   | gitleaks    | `[]`: `RuleID`, `File`, `StartLine`, `EndLine`, `Commit`, `Fingerprint`                                                                                                                                                                                                                                                                                 |
   | osv-scanner | `.results[]`: `source.path`. `packages[]`: `package.{name,version,ecosystem}`, `groups[].{ids,max_severity}`, and `vulnerabilities[]`: `id`, `aliases`, `affected[].ranges[].events[].fixed`                                                                                                                                                            |
   | checkov     | (object or array) `.results.failed_checks[]`: `check_id`, `check_name`, `file_path`, `file_line_range`, `resource`, `severity`                                                                                                                                                                                                                          |
   | dockle      | `.details[]`: `code`, `title`, `level`. Drop `alerts`, which can quote ENV values.                                                                                                                                                                                                                                                                      |
   | kubescape   | Failed controls: control ID, name, severity, status, and resource IDs with file paths                                                                                                                                                                                                                                                                   |
   | zap         | `.site[].alerts[]`: `pluginid`, `alert`, `riskcode`, `confidence`, `cweid`, and `instances[]`: `uri` with the query string removed, `method`                                                                                                                                                                                                            |

3. Logs: keep the logs of scanners that never print matched content: gitleaks (`--redact`), trivy, osv-scanner, checkov (`--compact`), kubescape, and dockle. For semgrep, keep stderr only. ZAP prints instance URLs with query strings, which can carry tokens, so keep only its `PASS`/`WARN-NEW`/`FAIL-NEW` summary counts. Any other log → write `log withheld: may contain matched content`.
4. `rm -rf "$RAW"` after projection, also on failure.
5. A finding keeps its file, line range, rule, scanner, and a fingerprint (`sha256` of rule + file + line), which is enough to locate it without the value.
6. Commands are recorded with any token, password, cookie, or `Authorization` value replaced by `[REDACTED]`.

## Normalized finding

`findings.json` = `{ "iteration": <n>, "findings": [ <finding> ] }`:

```json
{
  "id": "F-<first 10 hex of sha256(dedupe key)>",
  "category": "sast | dependency | secret | iac | image | kubernetes | dast",
  "scanners": ["trivy", "osv-scanner"],
  "rule": "<check or rule id>",
  "vuln_ids": ["CVE-…", "GHSA-…"],
  "title": "<short title, no secret values>",
  "severity": "critical | high | medium | low | info | unknown",
  "confidence": "high | medium | low",
  "file": "<repo-relative path | null>",
  "lines": [<start>, <end>],
  "commit": "<sha for history-only secrets | null>",
  "package": { "name": "…", "version": "…", "ecosystem": "…", "fixed_versions": ["…"], "direct": true } ,
  "component": "<resource, image, URL path, or package>",
  "exposure": "production | dev | test | unknown",
  "third_party": false,
  "fix_available": true,
  "exploitability": "known-exploited | public-exploit | network | local | unknown",
  "reachability": "reachable | unreachable | unknown",
  "priority": <0–100>,
  "attempts": 0,
  "status": "open | false-positive | accepted-risk | suppressed | needs-approval | manual | failed | fixed",
  "reports": ["iteration-<n>/<scanner>/<file>"]
}
```

Set `package` to `null` for non-dependency findings. Set `category: secret` for every credential finding, whatever the scanner: gitleaks, trivy `Secrets`, semgrep rules with CWE-798 or `secret`, `credential`, `password`, `token`, or `api-key` in the rule id, and checkov `CKV_SECRET_*`. That keeps the skill from reading their lines.

The agent writes every field except `status` and `attempts`, which the skill owns. The agent copies them from `manifest.json` `findings` (default `open` and 0). Set `third_party` to true for paths under the detection skip list.

Dedupe key = `category` + the first of the sorted `vuln_ids` (else `rule`) + (`package.name@package.version` for dependencies, else `file:lines[0]`) + `component`. Merge duplicates: union `scanners`, `vuln_ids`, and `reports`, and keep the highest severity and confidence. CVE, GHSA, and OSV aliases of one advisory count as the same identifier.

## Severity mapping

| Scanner     | Source field                         | Mapping                                                                 |
| ----------- | ------------------------------------ | ----------------------------------------------------------------------- |
| semgrep     | `extra.severity`                     | CRITICAL→critical, ERROR/HIGH→high, WARNING/MEDIUM→medium, INFO/LOW→low |
| trivy       | `Severity`                           | direct; UNKNOWN→unknown                                                 |
| gitleaks    | none                                 | high; confidence medium                                                 |
| osv-scanner | `groups[].max_severity` (CVSS score) | ≥9 critical, ≥7 high, ≥4 medium, >0 low, empty→unknown                  |
| checkov     | `severity`                           | direct; null→unknown                                                    |
| dockle      | `level`                              | FATAL→high, WARN→medium, INFO→low; drop PASS and SKIP                   |
| kubescape   | control severity                     | direct                                                                  |
| zap         | `riskcode`                           | 3 high, 2 medium, 1 low, 0 info                                         |

A report that the projection cannot map gives status `failed` (`unparsed report`), never zero findings.

## Priority

`priority` = severity (critical 40, high 30, medium 20, low 10, unknown 15, info 0)

- \+ exploitability (known-exploited 15, public-exploit 12, network 8, local 3, unknown 0)
- \+ reachability (reachable 15, unknown 5, unreachable 0)
- \+ confidence (high 10, medium 5, low 0)
- \+ fix available 10
- \+ exposure (production 10, unknown 5, dev or test 0)

Add impact on top (cap 100): 10 for authentication, authorization, injection, RCE, deserialization, or data exposure classes.

The agent sets the initial value from scanner data, using CISA KEV and EPSS only when the scanner report includes them. The skill re-scores after triage verifies reachability and exposure. Ties break by severity, then by fewer files touched.

## scans.json and manifest.json

Each scan record (the agent writes them to `scans.json`, and the skill copies them into the manifest):

```json
{
  "scanner": "trivy",
  "target": "fs | image:<slug> | <url>",
  "kind": "full | rescan-<k> | final",
  "version": "<X.Y.Z>",
  "image": "<image repo>:<tag>",
  "digest": "sha256:…",
  "command": "<redacted command>",
  "started_at": "<ISO 8601 UTC>",
  "completed_at": "…",
  "exit_code": 0,
  "status": "ok | findings | failed | timeout | unavailable | skipped",
  "reason": "<why, or null>",
  "reports": ["iteration-1/trivy/trivy-fs.json"],
  "log": "iteration-1/trivy/trivy.log",
  "counts": { "critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0, "unknown": 0 }
}
```

`manifest.json`:

```json
{
  "schema_version": 1,
  "run": "<ts>",
  "repo": "<root>",
  "skill": "cdk:scan-vulnerabilities",
  "options": {
    "max_iterations": 5,
    "images": [],
    "zap": { "target": null, "mode": "baseline", "authorized": false, "active_approved": false }
  },
  "git": { "branch": "…", "head": "…", "status_before": ["<porcelain lines>"], "protected_paths": ["…"] },
  "stack": { "languages": [], "dependencies": [], "iac": [], "kubernetes": false, "images": [], "web_target": null },
  "baseline": [
    {
      "command": "…",
      "kind": "build | typecheck | unit | integration | e2e",
      "exit_code": 0,
      "status": "pass | fail | unavailable"
    }
  ],
  "findings": {
    "F-…": {
      "status": "open | false-positive | accepted-risk | suppressed | needs-approval | manual | failed | fixed",
      "attempts": 0,
      "asked": false,
      "reason": "…",
      "first_seen": 1,
      "last_seen": 3
    }
  },
  "iterations": [
    {
      "iteration": 1,
      "kind": "full | final",
      "started_at": "…",
      "completed_at": "…",
      "scans": ["<scan record>"],
      "counts": {
        "<scanner>": { "critical": 0, "high": 0, "medium": 0, "low": 0, "info": 0, "unknown": 0 },
        "consolidated": { "…": 0 }
      },
      "remediations": [
        {
          "id": "R1.1",
          "findings": ["F-…"],
          "attempt": 1,
          "checkpoint": "<sha>",
          "status": "fixed | failed | reverted | needs-approval | skipped",
          "changed_files": [],
          "dependency_changes": [{ "name": "…", "from": "…", "to": "…", "manifest": "…" }],
          "validation_status": "pass | fail | partial | unavailable",
          "validation": [
            {
              "command": "…",
              "exit_code": 0,
              "status": "pass | fail | unavailable",
              "baseline": "pass | fail | unavailable"
            }
          ],
          "rescan": { "scanners": [], "result": "gone | still-present | failed", "new_findings": ["F-…"] }
        }
      ],
      "remaining_risk": [{ "finding": "F-…", "severity": "…", "status": "…", "reason": "…" }]
    }
  ],
  "result": {
    "stop_reason": "…",
    "initial_counts": {},
    "final_counts": {},
    "fixed": [],
    "remaining": [],
    "failed_attempts": [],
    "false_positives": [{ "finding": "F-…", "evidence": "…", "justification": "…" }],
    "accepted_risks": [{ "finding": "F-…", "justification": "…", "approved_by_user": true }],
    "suppressions": [],
    "modified_files": [],
    "dependency_changes": [],
    "validation_limitations": [],
    "manual_actions": []
  }
}
```

Write `manifest.json` after every scan, triage, and remediation, so an interrupted run still has a record.

## remediation-log.md

One entry per decision:

```markdown
## R<iteration>.<n> — <title> (<ids>) — <fixed | failed | reverted | needs-approval | false-positive | accepted-risk | manual>

- Findings: <F-ids>, priority <p>, <severity>
- Applicability: <evidence: file:line read, dependency resolved version, reachable call path or none>
- Checkpoint: <sha>; attempt <1 | 2>
- Change: <one line>; files: <paths>
- Dependency changes: <name from → to | none>
- Validation: <command: result (baseline result)>; …
- Rescan: <scanner: gone | still present | failed>
- Remaining risk: <one line | none>
```

A false positive or accepted risk also needs `- Evidence:` and `- Justification:` lines.

## summary.md

Sections, in order:

1. Scope: repo, branch at start and end, HEAD, run dir, iterations, stop reason, and the data that left the machine (`scanners.md` `## Network`).
2. Scanners: table of scanner, version, image, digest, status, and reason; below it, each `Newer major:` entry (verified major not upgraded) or "none".
3. Commands executed: redacted, one line each.
4. Initial and final counts: tables by scanner × severity, plus consolidated rows.
5. Fixed, remaining, failed attempts, verified false positives, accepted risks, approved suppressions.
6. Modified files and dependency changes.
7. Build and test results: baseline vs final.
8. Validation limitations, required manual actions (credential rotation, history purge, approvals), and scanners that did not complete.
9. Statement: "Verified only by the builds, tests, and scans listed above. Scanners have false negatives, and failed or skipped scanners are not evidence of absence."
