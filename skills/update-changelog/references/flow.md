# Flow details

## Contents

- Base · Release mode · Format drift · Review loop · Fallback

## Base

Base: input `base`; else the open PR or MR base for the current branch by origin host (`origin-url`; github `pr-base`, gitlab `mr-base`; CLI missing or error → skip); else `default-branch`, else the first that resolves of `origin/main`, `origin/master`, `main`, `master`. Run `fetch` at the end of step 1 (it is not read-only); failure or no remote → note it and use local refs. `mb` = `merge-base`. Read `base-changelog` (absent on the base → no released sections). Current equals the base branch, or no merge-base → the range starts at the latest reachable tag (`latest-tag`, first); no tag → all history, and more than 50 commits → AskUserQuestion: Use the last 50 commits (Recommended) | Use all history | Stop.

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
- Stop at any ask (restructure, base, release version or date, format drift) → `Result: cancelled`, `Stopped: <step>: user stopped`.

## Format drift

Format-only drift in a released section (headings, dates, header, link refs, markers, bullet style): list each fix, then ask: Apply format fixes to released sections (Recommended; keeps the file spec-conformant) | Unreleased only | Stop, scored per the Grill rule in `## Review loop`. Content changes to released entries need their own ask.

## Review loop

Run the `format.md` `## Review checklist` against the file, the diffs, and `tags`. A failing item that has a safe fix → collect the round's safe fixes, then apply them and re-run the whole checklist.

Apply each round's safe fixes directly and print the diff.

A failing item that needs unavailable information, touches a released section, or is ambiguous → decision question (≤4 options, the Recommended first, Stop). Grill (decision questions only): mine the conversation, files, and repo first, ask only what changes the output, and never fill a gap with an assumption. Use the structured-question tool (discover its name and limits at runtime; inside a delegated subagent ask in the main thread before delegating; unavailable → a numbered inline list, then stop for the answer). A fact-dependent question gets one web search per topic, official docs preferred, URLs cited; no search tool or source → "unverified", never an invented fact, source, or number. Before each question show the score table, the recommendation, and the option descriptions per `grill.md`. Last check: re-derive the entries from the same inputs; any resulting edit → fix and re-run. One full run = 1 round; the cap is checked after each. Cap hit → list the open items in `Open:` (as SKILL.md Rules).

## Fallback

AskUserQuestion or Write unavailable, or `--yes` (unattended run) → ask nothing and act per row; a row wins over any Recommended option:

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
