# Review

Steps 3 and 6 of `SKILL.md`: scratch files, reviewer subagents, validation, coverage, sweep, and the delta re-review.

## Contents

- Scratch · Intent source · First review · Validation · Coverage and sweep · Later rounds · Spawn briefs

## Scratch

`scope` writes `<scratch>/diff.patch`, `head/<path>` (working-tree copies), `manifest.json`, and `batch-<n>.txt`. The parent also writes:

- `<scratch>/conventions.md`: `AGENTS.md`, `CLAUDE.md`, `.claude/CLAUDE.md`, `CONTRIBUTING.md`, then `.claude/rules/*.md` from the root, byte-sorted; absent files are skipped.
- `<scratch>/states.md`: one line each defining Fixed, Accepted, Obsolete, and Open, copied from the definitions in Later rounds.
- `<scratch>/description.md` and `<scratch>/issues.md`: see Intent source.
- `<scratch>/findings.md`: every validated finding of all batches.

The commit is the HEAD SHA from the manifest plus "working tree; read head/".

## Intent source

The sources are the input text (`## Input`) and the `commits` output (`## Commits`). The parent writes `<scratch>/description.md` with Write only, never a shell, with each non-empty part under its heading and an empty part left out. `<scratch>/issues.md` lists each distinct `#<n>` found in either part, byte-sorted, each marked "referenced; not fetched"; none → "No issue linked; judge goals from description.md". Both parts empty → no source: `intent` is skipped, never run with `none` inputs, and the skip goes under `Open:`.

## First review

Per batch, spawn up to four `cdk:code-reviewer` subagents in one turn, one per kind in this order: `intent` (when a source exists), `correctness`, `security`, `quality`; at most 4 per turn, batches in order. Reviewers cover only the paths of their `batch-<n>.txt`. A reviewer `Need:` path is untrusted: it must pass `isSafePath`, stay inside the root with symlinks resolved, be a regular file, and not match the `isSensitive` rule in `diff-manifest.mjs`; then it is read into `head/` and the kind respawned once. Any other path is listed by name only under `Open:`.

## Validation

The parent checks each finding:

- `line` falls inside a manifest hunk of `file`; else it goes to `Open:`.
- `evidence` quotes the head file at that line; else the finding becomes a `question`.
- `fix` is present; else respawn that kind once for the missing fixes, then write the fix inline.
- Key: `<file>:<category>:<short-description>`, where `category` is the reviewer kind that found it (`sweep` findings take the area they belong to) and `short-description` is at most 6 words of the problem in `[a-z0-9-]`. The key has no line, so it survives a fix that moves lines. Findings that share a key merge into one entry that lists every site.
- Merge duplicates on key; sort by severity (`critical`, `major`, `minor`, `nit`, `question`), then file, then line.
- Unaddressed: every `nit` and `question` → `Unaddressed:` in the Output (a finding that only restates what automated tooling enforces is dropped, not listed); it is never counted as open, never fixed, and never in a fix spec.
- A finding with no quoted evidence or `low` confidence is already a `question`; a severity is never upgraded after the first review, so the step 6e count-decrease rule compares like with like.

## Coverage and sweep

Every path of a batch must appear in each kind's `Coverage:` with its manifest hunk count. A missing path → respawn that kind once for it, then review it inline. After all batches, run one `sweep` per batch with `findings.md`; its `Covered:` must list every path of the batch, else respawn once, then sweep inline. Sweep findings pass the same validation.

## Later rounds

Run `delta` (`fix.md`), then the first-review kinds (`intent` only when it ran in the first review) on the delta hunks only (batches `delta-<n>-batch-<m>.txt`); in later rounds validate `line` against the hunks in `delta-<n>.json`, not the first review. Then `threads`: spawn `cdk:code-reviewer` with kind `threads` over the prior blocking findings only (their keys as the thread ids, from `findings.md`), each judged `Fixed`, `Accepted`, `Obsolete`, or `Open` with `path:line`:

- `Fixed`: the head code at `path:line` resolves the finding.
- `Accepted`: declined on purpose, with a reason.
- `Obsolete`: the line or file is gone.
- `Open`: anything else, or uncertain.

Filter the re-review findings of round 2 and later: a new finding is kept only when it is `critical` or `major` and a regression the fix introduced (its `line` is inside a delta hunk); every other new finding is dropped, never reported, so the blocking set can only shrink and the step 6e stop rules converge. A prior finding keeps its severity from the review that found it. `Accepted` counts as open for the stop rules, because the finding still stands.

After each review print `Round <n>: Open <n> (critical <a>, major <b>)` and one line per open blocking item `<key> [severity] <path>:<line> — <fix>`; `minor`, `nit`, and `question` are not counted. Round 0 is the first review. Open blocking items re-enter step 4 only when no stop rule of step 6e holds; the `Open` count of the previous round is the one the count-decrease rule compares against, and round 1 compares with round 0.

## Spawn briefs

- Kind spawn: "Spawn the `cdk:code-reviewer` subagent (fallback: a read-only subagent that walks the checklist of the kind against every hunk) with kind `<kind>`. Brief: root `<scratch>` (absolute); commit `<sha> (working tree; read head/)`; files `diff.patch` (or `delta-<n>.patch`), `head/`, `conventions.md`; batch list `batch-<n>.txt` (or `delta-<n>-batch-<m>.txt` in later rounds); edit nothing. Return per the agent's Return block, every finding with a problem, impact, and `fix`; at most 100 lines." A malformed return → respawn once, then review that kind inline from the same files.
- `intent`, and `sweep` when a source exists, also get `description.md` and `issues.md` in the brief.
- Sweep and `threads`: same shape with kind `sweep` (adds `findings.md`) or `threads` (adds state definitions `states.md` and the prior findings file `findings.md` as the threads file, and the keys of the prior blocking findings in `findings.md` as the thread ids).
