# Flow details

## Contents

- Base · Release mode · Format drift · Confirm · Review loop · Fallback

## Base

Base: input `base`; else the open PR or MR base for the current branch by origin host (`origin-url`; github `pr-base`, gitlab `mr-base`; CLI missing or error → skip); else `default-branch`, else the first that resolves of `origin/main`, `origin/master`, `main`, `master`. Run `fetch`; failure or no remote → note it and use local refs. `mb` = `merge-base`. Current equals the base branch, or no merge-base → the range starts at the latest reachable tag (`latest-tag`, first); no tag → all history, and more than 50 commits → AskUserQuestion: Use the last 50 commits (Recommended) | Use all history | Stop.

## Release mode

Format and workflow: `format.md` `## Workflows`.

- Version missing → AskUserQuestion with candidates computed from the latest released version (none → 0.1.0 or 1.0.0): Removed or breaking → major, Added → minor, else patch, each with its reason, plus Stop. While the latest major is 0, shift down one level (breaking → minor, anything else → patch).
- Date missing → AskUserQuestion: Today (Recommended; the SessionStart date) | Enter another | Stop.
- Version already in the file and also in `base-changelog` → `Stopped: 5: version exists`. Only in this branch's file → update that unmerged section in place.

## Format drift

Format-only drift in a released section (headings, dates, header, link refs, markers, bullet style): list each fix, then AskUserQuestion: Apply format fixes to released sections (Recommended; keeps the file spec-conformant) | Unreleased only | Stop. Content changes to released entries need their own ask.

## Confirm

One AskUserQuestion at step 5, after the entries to write are printed. The text names each effect: the file written (created | updated), the entries added or updated per section, `format-md` when configured, and "never commits". One reason line cites the run's evidence: `Blocked:` items, excluded changes, a `Release mode` version or date taken from a default.

- Options: **Proceed** · **Revise** (notes via Other → back to step 4) · **Stop** (`Result: cancelled`, `Confirmed: no (stopped)`).
- Recommend Revise when `Blocked:` has an item or a classification is unresolved; else Proceed. The recommended option goes first with "(Recommended)".
- Revise cap 2; cap hit → offer only Proceed and Stop.
- The release-mode and format-drift asks stay separate and come first; this ask does not repeat them.
- The confirm covers this run's later edits to the same file (review loop); they print their diff and need no new ask.

## Review loop

Run the `format.md` `## Review checklist` against the file, the diffs, and `tags`. A failing item that has a safe fix → apply it and re-run the whole checklist. A failing item that needs unavailable information, touches a released section, or is ambiguous → AskUserQuestion (≤4 options, recommended first with a reason, Stop). Last check: re-derive the entries from the same inputs; any resulting edit → fix and re-run. One full run = 1 round; the cap is checked after each. Cap hit → list the open items in `Open:` (as SKILL.md Rules).

## Fallback

AskUserQuestion or Write unavailable (unattended run) → ask nothing, report `Confirmed: unattended`: an existing changelog that needs restructuring → `Stopped: 1: changelog not Keep a Changelog shaped`. Version or date missing in release mode → `Stopped: 5: version or date missing`. Format drift in released sections → list each fix under `Open:`, change nothing there. Missing link URL → `Open:`. Otherwise write non-release entries, and list every item that needed a decision in `Blocked:`.
