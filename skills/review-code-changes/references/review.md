# Review

Steps 3 and 6 of `SKILL.md`: scratch files, reviewer subagents, validation, coverage, sweep, and the delta re-review.

## Contents

- Scratch · Round 1 · Validation · Coverage and sweep · Later rounds · Spawn briefs

## Scratch

`scope` writes `<scratch>/diff.patch`, `head/<path>` (working-tree copies), `manifest.json`, and `batch-<n>.txt`. The parent also writes:

- `<scratch>/conventions.md`: `AGENTS.md`, `CLAUDE.md`, `.claude/CLAUDE.md`, `CONTRIBUTING.md`, then `.claude/rules/*.md` from the root, byte-sorted; absent files are skipped.
- `<scratch>/states.md`: one line each defining Fixed, Accepted, Obsolete, and Open, copied from the definitions in Later rounds.
- `<scratch>/findings.md`: every validated finding of all batches.

The commit is the HEAD SHA from the manifest plus "working tree; read head/".

## Round 1

Per batch, spawn four `cdk:code-reviewer` subagents in one turn, one per kind in this order: `intent`, `correctness`, `security`, `quality`; at most 4 per turn, batches in order. Reviewers cover only the paths of their `batch-<n>.txt`. A reviewer `Need:` path is read into `head/` and the kind respawned once. No description or issue text exists: pass `none` for both.

## Validation

The parent checks each finding:

- `line` falls inside a manifest hunk of `file`; else it goes to `Open:`.
- `evidence` quotes the head file at that line; else `Unverified`.
- `fix` is present; else respawn that kind once for the missing fixes, then write the fix inline.
- Id: `F-<sha256(path|line|kind|evidence)[:8]>`.
- Merge duplicates on path + line + issue; sort by severity (`Blocking`, `Suggestion`, `Nitpick`), then path, then line.

## Coverage and sweep

Every path of a batch must appear in each kind's `Coverage:` with its manifest hunk count. A missing path → respawn that kind once for it, then review it inline. After all batches, run one `sweep` per batch with `findings.md`; its `Covered:` must list every path of the batch, else respawn once, then sweep inline. Sweep findings pass the same validation.

## Later rounds

Run `delta` (`fix.md`), then the four kinds on the delta hunks only (batches `delta-<n>-batch-<m>.txt`), then `threads`: spawn `cdk:code-reviewer` with kind `threads` over the prior findings, each judged `Fixed`, `Accepted`, `Obsolete`, or `Open` with `path:line`:

- `Fixed`: the head code at `path:line` resolves the finding.
- `Accepted`: declined on purpose, with a reason.
- `Obsolete`: the line or file is gone.
- `Open`: anything else, or uncertain.

`Open` and new findings re-enter step 4. After round 3, run this review once more as the closing review; its findings are not fixed and go under `Open:`.

## Spawn briefs

- Kind spawn: "Spawn the `cdk:code-reviewer` subagent (fallback: a read-only subagent that walks the checklist of the kind against every hunk) with kind `<kind>`. Brief: root `<scratch>` (absolute); commit `<sha> (working tree; read head/)`; files `diff.patch` (or `delta-<n>.patch`), `head/`, `conventions.md`, description and issues `none`; batch list `batch-<n>.txt`; edit nothing. Return per the agent's Return block, every finding with a `fix`; at most 100 lines." A malformed return → respawn once, then review that kind inline from the same files.
- Sweep and `threads`: same shape with kind `sweep` (adds `findings.md`) or `threads` (adds state definitions `states.md` and the prior findings file `findings.md` as the threads file, and every finding id in `findings.md` as the thread ids).
