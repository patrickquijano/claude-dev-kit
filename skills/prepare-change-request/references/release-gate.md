# Release gate

Runs in step 5 of every create or update. It blocks the CR until `CHANGELOG.md` and the version satisfy `.claude/release-policy.json` (no policy → skipped). All checking is done by `cdk:bump-version` through the Skill tool in this main thread; this gate never computes a level or version and never edits a version file.

Inputs: target branch, `unattended` (`--yes`), `dry-run`, and the caller's step number for `Stopped:`.

## Procedure

1. **Check.** Run Skill `cdk:bump-version` with input `check target <target>`. It writes and asks nothing; read `Mode: check`, `Version:`, `Checks:`, `Blocked:`, and `Result:` from its Output.
   - `Stopped: … no release policy`, or `Checks:` ok with nothing to bump → `Release: skipped (<note>)` or `Release: ok (<level> → <required>)`; done.
   - `Blocked:` with `no-remote`, `fetch-failed`, `no-merge-base`, `unsafe-state`, or `unpushed` → stop with its fix; remediation cannot help.
2. **Dry run.** `dry-run` → `Release: failed (<codes>)` with each fix, change nothing, return to the caller, which continues; the failure is an `Open:` item, not a stop.
3. **Clean tree.** Only `changelog-*` and `version-*` codes are remediable. `dirty-check` non-empty → stop: `uncommitted changes block the release gate; run /cdk:commit-changes first`.
4. **Consent.** A version bump always needs the user's confirmation, even when `unattended`; `--yes` and `auto` never skip it.
   - Any `version-*` code → one AskUserQuestion: `Bump <base> → <required> (<level>), update changelog, commit, push (Recommended)` (reason: the check blocks CR creation and CI) | `Stop`. `Stop` → stop.
   - Only `changelog-*` codes: not `unattended` → ask `Update changelog, commit, push (Recommended)` | `Stop`; `unattended` → no ask, the caller's consent covers it.
5. **Remediate** via the Skill tool, in order:
   - any `version-*` → `cdk:bump-version target <target> confirmed` (step 4 was its confirmation); it chains `cdk:update-changelog` when a changelog exists.
   - then any remaining `changelog-*` (changelog missing, or no `version-*` code) → `cdk:update-changelog base <target>`.
   - then `cdk:commit-changes` with no input: atomic commits and a normal push.
   - Read each `Result:`; `stopped` or `cancelled` → stop with `release gate <codes>: <skill> stopped`.
6. **Revalidate.** Rerun step 1. Ok → `Release: fixed (<codes>)`; tell the caller to recompute its range. Still failing → one more round (2 rounds total), then stop with the remaining codes and fixes.

## Stops

A gate stop ends the run: `Release: failed (<codes>)`, `Result: stopped`, `Stopped: <step>: release gate <codes>: <fix>`, and the failure is listed in `Open:`. Nothing is created, hand-edited, or force-pushed; there is no skip and no override. Never edit `.claude/release-policy.json` to pass a check.

## Notes

- Idempotent: a repeat run changes nothing and never double-bumps.
- The caller never re-enters the gate after a Revise.
