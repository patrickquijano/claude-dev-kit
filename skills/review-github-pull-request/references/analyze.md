# Analyze

Steps 5–7 of `SKILL.md`: scratch files, four reviewer subagents per batch, findings, the coverage check, the sweep, and the verdict. Steps 5–6 always run; a failed open-thread check (`threads.md` `## Open-thread check`) only forces `REQUEST_CHANGES`.

## Contents

- Scratch · Areas · Findings · Priority · Coverage check · Sweep · Verdict · Spawn briefs

## Scratch

Write with the Write tool; fetch with `pr-view`, `pr-diff`, `file-at-sha`, `issue-view`.

- `<Scratch>/diff.patch`: `pr-diff`. An empty diff → `Result: nothing-to-do`.
- `<Scratch>/head/<path>`: each changed file at the head SHA, not already written by step 3. A path failing the `SKILL.md` path rule, a deleted file, a binary file, or an oversized file is skipped and listed under `Skipped:`.
- `<Scratch>/description.md`: title and body.
- `<Scratch>/issues.md`: each issue in `closingIssuesReferences` plus any `#<number>` the body names (`issue-view`, at most 5); failures → `Skipped:`.
- `<Scratch>/conventions.md`: repo `CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`, and `.claude/rules/*.md` at the head (`get_file_contents`); absent files are skipped.
- A diff over 60 files or 3,000 lines is split into batches of at most 60 files or 3,000 lines, and a single file over 3,000 lines forms its own batch; run the four areas per batch in successive turns (each turn at most 4 subagents), up to 4 batches. Only beyond 4 batches is coverage partial: analyze by `## Priority` and list the rest under `Skipped:`.
- `<Scratch>/batch-<n>.txt`: the parent writes each batch's changed paths, one per line, and gives it in each area brief; reviewers cover only the paths in it, and `Coverage:` is checked per batch. Paths under `Skipped:` are excluded from it and from the coverage check.
- **Context fetch:** a reviewer may return `Need:` with up to 10 head-SHA paths (callers, callees, tests of changed code). The parent fetches each with `file-at-sha` into `<Scratch>/head/` (same path rule; a failing path goes under `Skipped:`), then respawns that area with them.
- **Respawn caps:** one respawn per area per batch for each trigger (`Need:`, missing coverage, malformed return); a respawn returns only new findings plus a full `Coverage:`.

## Areas

Four `cdk:code-reviewer` subagents per batch in one turn, one per kind: `intent`, `correctness`, `security`, `quality`. The checklists, severity definitions, and `Findings:` format live in `agents/code-reviewer.md` `## Kinds`. An inline fallback walks this short list against every hunk:

1. **intent:** goals and issue items met; nothing unrelated; docs, migrations, config, or changelog present where the conventions require; the design fits the codebase.
2. **correctness:** null or empty input, boundaries, error paths, unhandled return values, concurrency, retries, cleanup, state, time and locale, callers and callees, backward compatibility.
3. **security:** injection, access control, secrets and logged sensitive data, crypto misuse, SSRF, mass assignment, insecure defaults, unsafe deserialization, supply-chain risk.
4. **quality:** a test per changed behavior including failure paths, dead or duplicated code, over-engineering, naming, comments that explain why, consistency, every conventions rule, performance hot spots.

## Findings

Reviewers return a `Status:` line, `Findings:` blocks `{severity, file, line, evidence, why, fix, confidence}`, then `Coverage:`, `Need:`, `Gaps:`, and `Question:` (a sweep adds `Covered:`). `severity` is `Blocking` (must change before merge), `Suggestion` (worth changing), or `Nitpick` (taste); a reviewer never echoes a secret's value. The parent validates each:

- `file` and `line` are the head-SHA path and the new-side line inside a `diff.patch` hunk; a finding outside a hunk or with no line goes to the body.
- `evidence` quotes the head code from `<Scratch>/head/`; a finding without it is `Unverified`: never inline, never Blocking, listed under `Unverified:`.
- A recurring finding lists every `file:line` site, one block per site; sites beyond the inline Nitpick cap (`post.md`) go in the body.
- `Coverage:` has one line per changed file in the batch: `path | hunks <n> | findings <n>`.

## Priority

Under partial coverage, analyze in this order: security-sensitive paths (auth, crypto, input parsing, permissions, secrets, CI), changed public interfaces, logic with branches, then tests, config, and docs.

## Coverage check

The parent, after step 6: every changed file in the batch (not under `Skipped:`) must appear in each area's `Coverage:`. A file missing from an area → respawn that area for the missing files; still missing → review it inline and note it under `Errors:`. A complete inline review closes the gap; it counts as a coverage gap for the verdict only when the file has no review at all.

## Sweep

`<Scratch>/findings.md` holds every validated finding of all batches, before the `## Verdict` filter. After the coverage check of every batch, the parent runs one read-only sweep subagent per batch (cap 1 per batch, inline fallback) with `diff.patch`, the head files, `findings.md`, and that batch's `batch-<n>.txt`; it ignores `Skipped:` paths and hunts for misses: a checklist item not applied to a hunk, more sites of a found pattern, issues that span areas. It returns findings in the `## Findings` format and `Covered:` the batches or paths it read; a `Covered:` that misses a path in the batch list leaves the sweep unfinished: respawn it once, then sweep that batch inline. Its findings go through the same `## Verdict` re-verify and dedupe. A sweep that stays unfinished after the inline fallback is noted under `Errors:` and, like an incomplete area, makes the verdict `COMMENT`.

## Verdict

Before the table, the parent re-reads each `Blocking` finding at its `file:line` in `<Scratch>/head/`; one the code does not show is downgraded to `Unverified`. It then drops a finding that matches an open thread (same path, overlapping line, same issue), counting it under `dropped (already open)`, and merges duplicates across areas (`duplicate`; the key is path + line + issue).

| Condition                                                                                                                                                                 | Event             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| Open-thread check failed (`threads.md` `## Open-thread check`), or any kept `Blocking` finding                                                                            | `REQUEST_CHANGES` |
| Draft PR; any failing or pending check in `statusCheckRollup`; any `Skipped` file, incomplete area or sweep, or coverage gap (no review at all) left after the respawn    | `COMMENT`         |
| Otherwise; kept `Suggestion`, `Nitpick`, and `Unverified` items are posted as non-blocking                                                                                | `APPROVE`         |

Rows apply top to bottom, first match wins: a draft PR with a kept `Blocking` finding gets `REQUEST_CHANGES`; a draft never gets `APPROVE`.

## Spawn briefs

- Step 6, one read-only subagent per area (four, one parallel turn): "Spawn the `cdk:code-reviewer` subagent (fallback: a read-only subagent that walks the `## Areas` list of the kind) with kind `<intent | correctness | security | quality>` to review one PR diff. Brief: root `<Scratch>` (absolute); head SHA `<full sha>`; files `<Scratch>/diff.patch`, `<Scratch>/head/`, `<Scratch>/description.md`, `<Scratch>/issues.md`, `<Scratch>/conventions.md`; batch list `<Scratch>/batch-<n>.txt` (cover only its paths); priority order from `## Priority` when coverage is partial; edit nothing and call no host tool. Return per `## Findings`." A malformed return → respawn per the `## Scratch` caps; a missing spawn tool or a second failure → review that area inline from the same scratch files and note it under `Errors:`.
- Sweep (one read-only subagent per batch): "Spawn the `cdk:code-reviewer` subagent (fallback: a read-only subagent that hunts for misses per `## Sweep`) with kind `sweep` for one batch of one PR diff. Brief: root `<Scratch>` (absolute); head SHA `<full sha>`; files `<Scratch>/diff.patch`, `<Scratch>/head/`, `<Scratch>/description.md`, `<Scratch>/issues.md`, `<Scratch>/conventions.md`, the validated findings of all batches `<Scratch>/findings.md`, and the batch list `<Scratch>/batch-<n>.txt` (ignore paths under `Skipped:`); edit nothing and call no host tool. Return per `## Findings`." A malformed return → respawn once; a missing spawn tool or a second failure → sweep that batch inline and note it under `Errors:`.
