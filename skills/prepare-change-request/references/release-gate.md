# Release gate

Shared by `cdk:prepare-change-request` (step 5). Layer one of the changelog and version enforcement; the project `PreToolUse` hook and CI run the same script (`hooks/scripts/lib/release-check.mjs`), so this gate never re-implements a check.

Inputs from the caller: target branch, `unattended` (`--yes`), `dry-run`, and its step number for `Stopped:`. Run from the repo root.

## Procedure

1. **Check.** `node ${CLAUDE_SKILL_DIR}/../../hooks/scripts/lib/release-check.mjs check --target <target> --pre-push --json`. The script fetches the target, uses `merge-base..HEAD` (so a rebased branch is judged against the new target tip), and reads `.claude/release-policy.json`.
   - `skipped` (no policy, or only exempt or non-user-facing changes) → `Release: skipped (<note>)`; done.
   - `ok` → `Release: ok (<level> → <required>)`; done.
   - `failures` with `no-remote`, `fetch-failed`, `no-merge-base`, or `unsafe-state` → stop with the failure's `message` and `fix`; remediation cannot help.
   - any other code (for example `unpushed`) → stop the same way.
2. **Dry run.** `dry-run` → `Release: failed (<codes>)` with each `fix`, change nothing, and return to the caller, which continues (dry run writes nothing); the failure is an item for its Resolve findings step, not a stop.
3. **Clean tree.** Only `changelog-*` and `version-*` codes are remediable here; any `uncommitted` code also takes this step's stop. `git status --porcelain=v1 --untracked-files=all` non-empty → stop, `uncommitted changes block the release gate; run /cdk:commit-changes first`. `cdk:commit-changes` commits everything dirty, so never remediate over unrelated edits.
4. **Consent.** A version bump always needs the user's confirmation, even when `unattended`. Any `version-*` code → one AskUserQuestion: `Bump <base> → <required> (<level>), update changelog, commit, push (Recommended)` (objective reason: the check blocks CR creation and CI until they exist) | `Stop`. `Stop` → stop. Only `changelog-*` codes (no `version-*`): not `unattended` → one AskUserQuestion: `Update changelog, commit, push (Recommended)` | `Stop`; `unattended` → no ask; the caller's consent covers it.
5. **Remediate**, chained via the Skill tool in this main thread per `${CLAUDE_SKILL_DIR}/../shared/references/orchestration.md`:
   - any `version-*` → `cdk:bump-version target <target> confirmed` first (the question above was its confirmation); it chains `cdk:write-changelog` when the changelog exists.
   - then any `changelog-*` not covered by that (changelog missing, or no `version-*` failure) → `cdk:write-changelog base <target>`.
   - then `cdk:commit-changes` with no input: it makes atomic commits (`docs(changelog): …`, `chore(release): bump version to <required>`) and pushes.
   - Read each `Result:` line; `stopped` or `cancelled` → stop the gate with `release gate <codes>: <skill> stopped`.
6. **Revalidate.** Re-run step 1. `ok` → `Release: fixed (<codes>)`, then tell the caller to recompute its range and push need. Failures remain → one more round (max 2 rounds in total); still failing → stop with the remaining codes and `fix`.

## Stops

A gate stop ends the caller's run: `Result: stopped`, `Stopped: <caller step>: release gate <codes>: <fix>`, `Release: failed (<codes>)`, `Resolution` from the caller's Resolve findings step (ask-only; the failure is its item). Nothing is created, edited by hand, or force-pushed. There is no skip and no override; an exception exists only as an `exempt` entry with a reason in `.claude/release-policy.json`, reviewed like any change. Never edit that policy to make a check pass.

## Notes

- Idempotent: `cdk:write-changelog` (also chained by `cdk:bump-version`) matches existing bullets by meaning and `bump` sets the required version (keeping a deliberate higher release that has a matching new changelog section) rather than adding to it, so a repeat run changes nothing and never double-bumps.
- The gate is never re-entered by its caller.
