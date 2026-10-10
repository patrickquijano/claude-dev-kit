# Release gate

Shared by `cdk:prepare-pull-request` (step 5) and `cdk:prepare-merge-request` (step 7). Layer one of the changelog and version enforcement; the project `PreToolUse` hook and CI run the same script (`hooks/scripts/release-check.mjs`), so this gate never re-implements a check.

Inputs from the caller: target branch, `unattended` (`--yes` or `auto`), `dry-run`, and its step number for `Stopped:`. Run from the repo root.

## Procedure

1. **Check.** `node ${CLAUDE_SKILL_DIR}/../../hooks/scripts/release-check.mjs check --target <target> --pre-push --json`. The script fetches the target, uses `merge-base..HEAD` (so a rebased branch is judged against the new target tip), and reads `.claude/release-policy.json`.
   - `skipped` (no policy, or only exempt or non-user-facing changes) → `Release: skipped (<note>)`; done.
   - `ok` → `Release: ok (<level> → <required>)`; done.
   - `failures` with `no-remote`, `fetch-failed`, `no-merge-base`, or `unsafe-state` → stop with the failure's `message` and `fix`; remediation cannot help.
2. **Dry run.** `dry-run` → `Release: failed (<codes>)` with each `fix`, change nothing, and return to the caller.
3. **Clean tree.** Only `changelog-*` and `version-*` codes are remediable here; any `uncommitted` code also takes this step's stop. `git status --porcelain=v1 --untracked-files=all` non-empty → stop, `uncommitted changes block the release gate; run /cdk:commit-changes first`. `cdk:commit-changes` commits everything dirty, so never remediate over unrelated edits.
4. **Consent.** Not `unattended` → one AskUserQuestion: `Update changelog and version, commit, push (Recommended)` (objective reason: the check blocks PR/MR creation and CI until they exist) | `Stop`. `Stop` → stop. `unattended` → no ask; the caller's consent covers it.
5. **Remediate**, chained via the Skill tool in this main thread per `${CLAUDE_SKILL_DIR}/../ship-changes/orchestration.md`:
   - any `changelog-*` → `cdk:write-changelog base <target>`.
   - any `version-*` → `cdk:bump-version target <target>`.
   - then `cdk:commit-changes` with no input: it makes atomic commits (`docs(changelog): …`, `chore(release): bump version to <required>`) and pushes.
   - Read each `Result:` line; `stopped` or `cancelled` → stop the gate with `release gate <codes>: <skill> stopped`.
6. **Revalidate.** Re-run step 1. `ok` → `Release: fixed (<codes>)`, then tell the caller to recompute its range and push need. Failures remain → one more round (max 2 rounds in total); still failing → stop with the remaining codes and `fix`.

## Stops

A gate stop ends the caller's run: `Result: stopped`, `Stopped: <caller step>: release gate <codes>: <fix>`, `Release: failed (<codes>)`, `Resolution: not run (stopped)`. Nothing is created, edited by hand, or force-pushed. There is no skip and no override; an exception exists only as an `exempt` entry with a reason in `.claude/release-policy.json`, reviewed like any change. Never edit that policy to make a check pass.

## Notes

- Idempotent: `cdk:write-changelog` matches existing bullets by meaning and `bump` sets the required version rather than adding to it, so a repeat run changes nothing and never double-bumps.
- The gate is never re-entered by its caller.
