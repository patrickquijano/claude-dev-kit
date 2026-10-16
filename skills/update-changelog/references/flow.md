# Flow details

## Contents

- Base · Release mode · Review loop · Fallback

## Base

Base: input `base`; else the open PR or MR base for the current branch by origin host (`origin-url`; github `pr-base`, gitlab `mr-base`; CLI missing or error → skip); else `default-branch`, else the first that resolves of `origin/main`, `origin/master`, `main`, `master`. Run `fetch`; failure or no remote → note it and use local refs. `mb` = `merge-base`. Current equals the base branch, or no merge-base → the range starts at the latest reachable tag (`latest-tag`, first); no tag → all history, and more than 50 commits → AskUserQuestion: Use the last 50 commits (Recommended) | Use all history | Stop.

## Release mode

Format and workflow: `format.md` `## Workflows`.

- Version missing → AskUserQuestion with candidates computed from the latest released version (none → 0.1.0 or 1.0.0): Removed or breaking → major, Added → minor, else patch, each with its reason, plus Stop.
- Date missing → AskUserQuestion: Today (Recommended; the SessionStart date) | Enter another | Stop.
- Version already in the file and also in the base branch's `CHANGELOG.md` → `Stopped: 5: version exists`. Only in this branch's file → update that unmerged section in place.

## Review loop

Run the `format.md` `## Review checklist` against the file, the diffs, and `tags`. A failing item that has a safe fix → apply it and re-run the whole checklist. A failing item that needs unavailable information, touches a released section, or is ambiguous → AskUserQuestion (≤4 options, recommended first with a reason, Stop). Last check: re-derive the entries from the same inputs; any resulting edit → fix and re-run. One full run = 1 round; the cap is checked after each. Cap hit → list the open items in `Blocked:` and `Result: stopped`.

## Fallback

AskUserQuestion or Write unavailable (unattended run) → ask nothing: Version or date missing in release mode → `Stopped: 5: version or date missing`. Otherwise write non-release entries, and list every item that needed a decision in `Blocked:`.
