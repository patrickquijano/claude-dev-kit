# Flow details

## Contents

- Base · Release mode · Format drift · Plan mode · Review loop · Fallback

## Base

Base: input `base`; else the open PR or MR base for the current branch by origin host (`origin-url`; github `pr-base`, gitlab `mr-base`; CLI missing or error → skip); else `default-branch`, else the first that resolves of `origin/main`, `origin/master`, `main`, `master`. Run `fetch` at the end of step 1, before plan mode (it is not read-only); failure or no remote → note it and use local refs. `mb` = `merge-base`. Read `base-changelog` (absent on the base → no released sections). Current equals the base branch, or no merge-base → the range starts at the latest reachable tag (`latest-tag`, first); no tag → all history, and more than 50 commits → AskUserQuestion: Use the last 50 commits (Recommended) | Use all history | Stop.

`<range>` for `commits`, `committed-names`, and `committed-stat`:

- merge-base → `<mb>..HEAD`.
- tag → `<tag>..HEAD`.
- all history → `commits` takes `HEAD`; the diffs run against the empty tree: `<empty-tree>..HEAD` with `<empty-tree>` = `4b825dc642cb6eb9a060e54bf8d69288fbee4904`.
- last 50 → `<start>^..HEAD`, `<start>` = the last line of `last-50`.

## Release mode

Format and workflow: `format.md` `## Workflows`.

- Version missing → run `node ${CLAUDE_SKILL_DIR}/scripts/release-candidates.mjs candidates --latest <latest released version or none> --types <comma-separated change types since it>`, then AskUserQuestion with its `candidates` (each with its reason) plus Stop.
- Date missing → AskUserQuestion: Today (Recommended; the SessionStart date, else the `today` row) | Enter another | Stop.
- Version already in the file and also in `base-changelog` → `Stopped: 5: version exists`. Only in this branch's file → update that unmerged section in place.

## Format drift

Format-only drift in a released section (headings, dates, header, link refs, markers, bullet style): list each fix, then AskUserQuestion: Apply format fixes to released sections (Recommended; keeps the file spec-conformant) | Unreleased only | Stop. Content changes to released entries need their own ask.

## Plan mode

Runs once, right after the step 1 `fetch`. Unattended → `Plan mode: skipped (unattended)`.

- Plan mode already active → `already active`, stay in it. Otherwise load `EnterPlanMode` with ToolSearch if it is deferred, then call it. The user declines it, or the tool is unavailable → `declined`, `Result: stopped`, `Stopped: 5: plan mode declined`, `Confirmed: no (stopped)`; nothing is written.
- Steps 2–5 before the write run inside plan mode: they only read, run `release-candidates.mjs`, and ask. The 50-commit, release version/date, and format-drift asks stay separate and come before the plan.
- Nothing to write (identical content) → no plan file and no `ExitPlanMode`; `Confirmed: n/a (unchanged or stopped earlier)`, `Result: nothing-to-do`.
- The plan file holds: the entries to add or update, per section; any approved released-section format fixes; the link references; the effects (`CHANGELOG.md` created or updated, `format-md` when configured, "never commits, tags, or pushes"); one reason line citing `Blocked:` items, excluded changes, and a release version or date taken from a default. Call `ExitPlanMode`.
- Approval (`Confirmed: yes`) covers the write, `format-md`, and this run's review-loop edits to the file; they print their diff and need no new ask.
- Rejection → revise per the feedback (back to step 4) and call `ExitPlanMode` again; 3 rejections → `Result: cancelled`, `Stopped: 5: plan rejected`, `Confirmed: no (stopped)`. `Confirmed: revised <n>` counts the rejections.
- Stop at any earlier ask (restructure, base, release version or date, format drift) → `Result: cancelled`, `Confirmed: no (stopped)`, `Stopped: <step>: user stopped`.
- Any end before the write prints the Output with `Plan mode:` as reached (`skipped (<reason>)` when never entered).

## Review loop

Run the `format.md` `## Review checklist` against the file, the diffs, and `tags`. A failing item that has a safe fix → apply it and re-run the whole checklist. A failing item that needs unavailable information, touches a released section, or is ambiguous → AskUserQuestion (≤4 options, recommended first with a reason, Stop). Last check: re-derive the entries from the same inputs; any resulting edit → fix and re-run. One full run = 1 round; the cap is checked after each. Cap hit → list the open items in `Open:` (as SKILL.md Rules).

## Fallback

AskUserQuestion or Write unavailable (unattended run) → ask nothing, report `Confirmed: unattended`, and act per row:

| Ask                                     | Action                                                    |
| --------------------------------------- | --------------------------------------------------------- |
| Changelog needs restructuring           | `Stopped: 1: changelog not Keep a Changelog shaped`       |
| Release without version or date         | `Stopped: 5: version or date missing`                     |
| Release with both version and date      | Cut the release                                           |
| Format drift in released sections       | List each fix under `Open:`; change nothing there         |
| Missing link URL                        | `Open:`                                                   |
| More than 50 commits                    | Use the last 50; list under `Blocked:`                    |
| Write unavailable                       | Print the entries, then `Stopped: 5: write unavailable`   |
| Review-loop ask                         | List under `Open:`; change nothing                        |
| Any other decision in a non-release run | Write non-release entries; list the item under `Blocked:` |
