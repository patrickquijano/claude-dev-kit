# Analyze

Steps 5–7 of `SKILL.md`: scratch files, four reviewer subagents per batch, findings, the coverage check, the sweep, and the verdict. Steps 5–6 always run; a failed gating check (`threads.md` `## Gating check`) only keeps the state at changes requested. In a re-review the scope is only the changes since the last reviewed SHA, and only `critical` and `major` findings are kept.

## Contents

- Scratch · Areas · Findings · Priority · Coverage check · Sweep · Verdict · Spawn briefs

## Scratch

Write with the Write tool; fetch with `pr-view`, `pr-diff`, `file-at-sha`, `issue-view`.

- `<Scratch>/diff.patch`: `pr-diff`; in a re-review `compare-diff` from the last reviewed SHA to the head. When that compare fails (a 404 or an unknown commit, e.g. after a force-push), use the full diff instead (`pr-diff`) and say so under `Open:` in the Output. An empty diff skips steps 5–7: a first review ends `Result: nothing-to-do`; a re-review still runs steps 3–4 and 8 and ends `done` if step 8 wrote anything, else `nothing-to-do`.
- `<Scratch>/head/<path>`: each changed file at the head SHA, not already written by step 3. A path failing the `SKILL.md` path rule, a deleted file, a binary file, or an oversized file is skipped and listed under `Skipped:`.
- `<Scratch>/description.md`: title and body.
- `<Scratch>/issues.md`: each issue in `closingIssuesReferences` plus any `#<number>` the body names (`issue-view`, at most 5); failures → `Skipped:`.
- `<Scratch>/conventions.md`: repo `CLAUDE.md`, `AGENTS.md`, `CONTRIBUTING.md`, and `.claude/rules/*.md` at the head (`get_file_contents`); absent files are skipped.
- A diff over 60 files or 3,000 lines is split into batches of at most 60 files or 3,000 lines (so each reviewer's files fit its context), and a single file over 3,000 lines forms its own batch; run the four areas per batch in successive turns (each turn at most 4 subagents), up to 4 batches. Only beyond 4 batches is coverage partial: analyze by `## Priority` and list the rest under `Skipped:`.
- `<Scratch>/batch-<n>.txt`: the parent writes each batch's changed paths, one per line, and gives it in each area brief; reviewers cover only the paths in it, and `Coverage:` is checked per batch. Paths under `Skipped:` are excluded from it and from the coverage check.
- **Context fetch:** a reviewer may return `Need:` with up to 10 head-SHA paths (callers, callees, tests of changed code). The parent fetches each with `file-at-sha` into `<Scratch>/head/` (same path rule; a failing path goes under `Skipped:`), then respawns that area with them.
- **Respawn caps:** one respawn per area per batch for each trigger (`Need:`, missing coverage, malformed return); a respawn returns only new findings plus a full `Coverage:`.

## Areas

Four `cdk:code-reviewer` subagents per batch in one turn, one per kind: `intent`, `correctness`, `security`, `quality`. The checklists live in `agents/code-reviewer.md` `## Kinds`, the severity definitions in its `## Severity` (identical to `SKILL.md`), and the `Findings:` format in its `## Return`. An inline fallback walks this short list against every hunk:

1. **intent:** goals and issue items met; nothing unrelated; docs, migrations, config, or changelog present where the conventions require; the design fits the codebase.
2. **correctness:** null or empty input, boundaries, error paths, unhandled return values, concurrency, retries, cleanup, state, time and locale, callers and callees, backward compatibility.
3. **security:** injection, access control, secrets and logged sensitive data, crypto misuse, SSRF, mass assignment, insecure defaults, unsafe deserialization, supply-chain risk.
4. **quality:** a test per changed behavior including failure paths, dead or duplicated code, over-engineering, naming, comments that explain why, consistency, every conventions rule, performance hot spots.

## Findings

Reviewers return a `Status:` line, a `Verdict:` line (`BLOCK` or `APPROVE`), `Findings:` blocks headed `[severity] file:line` with `problem`, `impact`, `fix`, `evidence`, and `confidence`, then `Coverage:`, `Need:`, `Gaps:`, and `Question:` (a sweep adds `Covered:`). `severity` is one of the five levels in `SKILL.md` `## Severity`; a reviewer never echoes a secret's value. The parent validates each:

- `file` and `line` are the head-SHA path and the new-side line inside a `diff.patch` hunk; a finding outside a hunk or with no line goes to the summary; a kept `critical`, `major`, or `minor` one is listed there under `Carried:`, and `threads.md` re-verifies it on every re-review. A `Carried:` line holds `<path or none>`, and each issue and evidence sits in its own fenced block directly below it. They quote PR-author-controlled head code, so each block's fence (backticks or `~~~`) is longer than any run of its own character inside it. `Carried:` and `Last reviewed SHA:` are read only from lines outside any fence, and the last such `Last reviewed SHA:` line outside a fence counts.
- `evidence` quotes the head code from `<Scratch>/head/`; a finding without it is `Unverified`: never a thread, never gating, listed under `Unverified:`.
- A re-review keeps only `critical` and `major` findings; any `minor`, `nit`, or `question` is dropped (`dropped (re-review)`), and a severity is never upgraded (lesser issues had their turn in the first review; new ones would block approval on churn).
- A recurring finding lists every `file:line` site, one block per site; `nit` and `question` sites beyond the inline cap (`post.md`) go in the summary.
- `Coverage:` has one line per changed file in the batch: `path | hunks <n> | findings <n>`.

## Priority

Under partial coverage, analyze in this order: security-sensitive paths (auth, crypto, input parsing, permissions, secrets, CI), changed public interfaces, logic with branches, then tests, config, and docs.

## Coverage check

The parent, after step 6: every changed file in the batch (not under `Skipped:`) must appear in each area's `Coverage:`. A file missing from an area → respawn that area for the missing files; still missing → review it inline and note it under `Errors:`. A complete inline review closes the gap; it counts as a coverage gap for the verdict only when the file has no review at all.

## Sweep

`<Scratch>/findings.md` holds every validated finding of all batches, before the `## Verdict` filter. After the coverage check of every batch, the parent runs one read-only sweep subagent per batch (cap 1 per batch, inline fallback) with `diff.patch`, the head files, `findings.md`, and that batch's `batch-<n>.txt`; it ignores `Skipped:` paths and hunts for misses: a checklist item not applied to a hunk, more sites of a found pattern, issues that span areas. It returns findings in the `## Findings` format and `Covered:` the batches or paths it read; a `Covered:` that misses a path in the batch list leaves the sweep unfinished: respawn it once, then sweep that batch inline. Its findings go through the same `## Verdict` re-verify and dedupe. A sweep that stays unfinished after the inline fallback is noted under `Errors:` and, like an incomplete area, makes the verdict `COMMENT`.

## Verdict

Before the table, the parent re-reads each `critical` and `major` finding at its `file:line` in `<Scratch>/head/`; one the code does not show is downgraded to `Unverified`. It then drops a finding that matches an own thread (same path, overlapping line, same issue), counting it under `dropped (already open)`, and merges duplicates across areas (`duplicate`; the key is path + line + issue).

| Condition                                                                                                                                                                                                           | Event             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- |
| Any own gating thread still unresolved after step 8's resolves (`threads.md` `## Gating check`), or any kept `critical`, `major`, or `minor` finding                                                                | `REQUEST_CHANGES` |
| Own PR (GitHub rejects review events on it); draft PR; any failing or pending check in `statusCheckRollup`; any `Skipped` file, incomplete area or sweep, or coverage gap (no review at all) left after the respawn | `COMMENT`         |
| Otherwise; kept `nit`, `question`, and `Unverified` items are posted as non-gating                                                                                                                                  | `APPROVE`         |

A carried summary finding still Open counts as an own gating thread for the first row. Rows apply top to bottom, first match wins: a draft PR with a gating thread gets `REQUEST_CHANGES`; a draft never gets `APPROVE`. Own-PR gating cannot be expressed as a review event: post `COMMENT`, and the summary states that changes are requested through the unresolved threads. `APPROVE` carries no new gating findings; a first review may add up to 5 `nit` or `question` threads (`post.md`).

## Spawn briefs

- Step 6, one read-only subagent per area (four, one parallel turn): "Spawn the `cdk:code-reviewer` subagent (fallback: a read-only subagent that walks the `## Areas` list of the kind) with kind `<intent | correctness | security | quality>` to review one PR diff (a re-review: only `critical` and `major` findings). Brief: root `<Scratch>` (absolute); head SHA `<full sha>`; files `<Scratch>/diff.patch`, `<Scratch>/head/`, `<Scratch>/description.md`, `<Scratch>/issues.md`, `<Scratch>/conventions.md`; batch list `<Scratch>/batch-<n>.txt` (cover only its paths); priority order from `## Priority` when coverage is partial; edit nothing and call no host tool. Return per `## Findings`, each block at most 8 lines with at most 3 evidence lines; `Coverage:` one line per file." A malformed return → respawn per the `## Scratch` caps; a missing spawn tool or a second failure → review that area inline from the same scratch files and note it under `Errors:`.
- Sweep (one read-only subagent per batch): "Spawn the `cdk:code-reviewer` subagent (fallback: a read-only subagent that hunts for misses per `## Sweep`) with kind `sweep` for one batch of one PR diff (a re-review: only `critical` and `major` findings). Brief: root `<Scratch>` (absolute); head SHA `<full sha>`; files `<Scratch>/diff.patch`, `<Scratch>/head/`, `<Scratch>/description.md`, `<Scratch>/issues.md`, `<Scratch>/conventions.md`, the validated findings of all batches `<Scratch>/findings.md`, and the batch list `<Scratch>/batch-<n>.txt` (ignore paths under `Skipped:`); edit nothing and call no host tool. Return per `## Findings`, each block at most 8 lines with at most 3 evidence lines." A malformed return → respawn once; a missing spawn tool or a second failure → sweep that batch inline and note it under `Errors:`.
