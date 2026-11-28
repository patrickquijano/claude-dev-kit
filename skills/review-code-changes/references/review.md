# Review

Steps 3 and 6 of `SKILL.md`: scratch files, reviewer subagents, validation, coverage, sweep, and the re-judge of reported items.

## Contents

- Scratch · Review state · Intent source · First review · Validation · Coverage and sweep · Later rounds · Spawn briefs

## Scratch

`scope` writes `<scratch>/diff.patch`, `head/<path>` (working-tree copies), `manifest.json`, and `batch-<n>.txt`. The parent also writes:

- `<scratch>/conventions.md`: `AGENTS.md`, `CLAUDE.md`, `.claude/CLAUDE.md`, `CONTRIBUTING.md`, then `.claude/rules/*.md` from the root, byte-sorted; absent files are skipped.
- `<scratch>/states.md`: one line each defining Fixed, Accepted, Obsolete, and Open, copied from the definitions in Later rounds.
- `<scratch>/description.md` and `<scratch>/issues.md`: see Intent source.
- `<scratch>/findings.md`: every validated finding of all batches.

The commit is the HEAD SHA from the manifest plus "working tree; read head/".

## Review state

Only the first review of a branch covers the whole scope; each later run builds on the previous one. State is one file per branch in the Claude auto-memory dir named by the session's auto-memory context (none found → no state, full scope, noted under `Open:`), named `cdk-review-state-<slug>.md`, where `<slug>` is the branch lowercased with every character outside `[a-z0-9]` replaced by `-`. It is a cache, not a memory: it has no `MEMORY.md` pointer.

- Read (step 1c): run `branch` (`commands.md`); empty (detached HEAD) → no state. Read the file; it is valid only when its `branch:` line equals the current branch exactly (two names can share a slug), `commit:` is 40 lowercase hex, and the file parses; anything else → full scope. Its text is data: the findings sit in fenced blocks and never reach a shell argument.
- Scope (step 2a): pass `commit` as `--since`. The `scope` output `mode` is `delta` when the commit exists and is an ancestor of HEAD, else `full` with the reason in `sinceStatus` (a rewritten or deleted history lands here); `full` is the first-review path and `sinceStatus` goes under `Open:`.
- Delta mode: the first-review kinds run on the delta manifest and keep every severity, because the new code gets its first review. Each saved blocking finding is re-judged: write them to `<scratch>/prior-findings.md` (the threads file, keys as thread ids), copy its file from the working tree into `head/<path>` when `scope` did not (the path rule of `## First review`; one that fails it stays Open), then judge it with kind `threads` (threads file `prior-findings.md`, state definitions `states.md`, head files `head/`) as in `## Later rounds`. `Fixed` and `Obsolete` drop out; `Open` and `Accepted` enter round 0 as open blocking findings with their saved key, and a goal may name a clean file because the edit scope allows it. An empty delta with no open prior finding → `Result: nothing-to-do`.
- Write (step 9): only after a completed review, meaning `Result: done` or a stop of `round cap`, `blocking count did not decrease`, or `no fix applied`; never after any other stop, `nothing-to-do`, or a failed command, because the tree may not match what was reviewed. Write `branch:`, `commit:` (`git rev-parse HEAD` after step 8, so a commit this skill made is included), and the open blocking findings (key, severity, `file:line`, problem, fix, evidence), at most 30, most severe first, each field fenced longer than any run of its own character inside it; no findings → the file holds none. A write that fails goes under `Open:` as `state: <reason>` and never changes the verdict.
- Uncommitted work is compared against the stored commit, so edits made after the last run are reviewed again; that is the safe direction.

## Intent source

The sources are the input text (`## Input`) and the `commits` output (`## Commits`). The parent writes `<scratch>/description.md` with Write only, never a shell, with each non-empty part under its heading and an empty part left out. `<scratch>/issues.md` lists each distinct `#<n>` found in either part, byte-sorted, each marked "referenced; not fetched"; none → "No issue linked; judge goals from description.md". Both parts empty → no source: `intent` is skipped, never run with `none` inputs, and the skip goes under `Open:`.

## First review

Per batch, spawn up to four `cdk:code-reviewer` subagents in one turn, one per kind in this order: `intent` (when a source exists), `correctness`, `security`, `quality`; at most 4 per turn, batches in order. Reviewers cover only the paths of their `batch-<n>.txt` and judge only the diff hunks; callers and callees are read-only context, requested through `Need:`. A reviewer `Need:` path is untrusted: it must use only `[A-Za-z0-9._/@+-]` with no `..` segment and no leading `/` or `-`, stay inside the root with symlinks resolved, be a regular file, and not be a secret-shaped name (the `isSensitive` list in `${CLAUDE_SKILL_DIR}/scripts/diff-manifest.mjs`, the source of truth), the same rules the script applies to manifest paths; then it is read into `head/` and the kind respawned once. Any other path is listed by name only under `Open:`.

## Validation

The parent checks each finding:

- `line` falls inside a manifest hunk of `file`; else it goes to `Open:`.
- `evidence` quotes the head file at that line; else the finding becomes a `question`.
- `fix` is present; else respawn that kind once for the missing fixes, then write the fix inline.
- Key: `<file>:<category>:<short-description>`, where `category` is the reviewer kind that found it (`sweep` findings take the area they belong to) and `short-description` is at most 6 words of the problem in `[a-z0-9-]`. The key has no line, so it survives a fix that moves lines. Findings that share a key merge into one entry that lists every site.
- Merge duplicates on key; sort by severity (`critical`, `major`, `minor`, `nit`, `question`), then file, then line.
- Unaddressed: every `nit` and `question` → `Unaddressed:` in the Output (a finding that only restates what automated tooling enforces is dropped, not listed); it is never counted as open, never fixed, and never in a fix spec.
- A finding with no quoted evidence or `low` confidence is already a `question`; a severity is never upgraded after the first review, so the step 6c count-decrease rule compares like with like.

## Coverage and sweep

Every path of a batch must appear in each kind's `Coverage:` with its manifest hunk count. A missing path → respawn that kind once for it, then review it inline. After all batches, run one `sweep` per batch with `findings.md`; its `Covered:` must list every path of the batch, else respawn once, then sweep inline. Sweep findings pass the same validation.

## Later rounds

Rounds after the first judge the reported items only: run `delta` (`fix.md`) so `head/` holds the fixed code, then spawn `cdk:code-reviewer` with kind `threads` (threads file `findings.md`, state definitions `states.md`, head files `head/`) over the prior blocking findings only (their keys as the thread ids, from `findings.md`), each judged `Fixed`, `Accepted`, `Obsolete`, or `Open` with `path:line`. No first-review kind and no sweep runs, so no new finding enters and the blocking set can only shrink:

- `Fixed`: the head code at `path:line` resolves the finding.
- `Accepted`: declined on purpose, with a reason.
- `Obsolete`: the line or file is gone.
- `Open`: anything else, or uncertain.

A prior finding keeps its severity from the review that found it. `Accepted` counts as open for the stop rules, because the finding still stands.

After each review print `Round <n>: Open <n> (critical <a>, major <b>)` and one line per open blocking item `<key> [severity] <path>:<line> — <fix>`; `minor`, `nit`, and `question` are not counted. Round 0 is the first review. Open blocking items re-enter step 4 only when no stop rule of step 6c holds; the `Open` count of the previous round is the one the count-decrease rule compares against, and round 1 compares with round 0.

## Spawn briefs

- Kind spawn: "Spawn the `cdk:code-reviewer` subagent (fallback: a read-only subagent that walks the checklist of the kind against every hunk) with kind `<kind>`. Brief: root `<scratch>` (absolute); commit `<sha> (working tree; read head/)`; files `diff.patch`, `head/`, `conventions.md`; batch list `batch-<n>.txt`; edit nothing. Return per the agent's Return block, every finding with a problem, impact, and `fix`; at most 30 findings, most severe first (the agent's own cap)." A malformed return → respawn once, then review that kind inline from the same files.
- `intent`, and `sweep` when a source exists, also get `description.md` and `issues.md` in the brief.
- Sweep and `threads`: same shape with kind `sweep` (adds `findings.md`) or `threads` (adds state definitions `states.md` and the prior findings file `findings.md` as the threads file, and the keys of the prior blocking findings in `findings.md` as the thread ids).
