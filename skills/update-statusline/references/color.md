# Color

## Contents

- Candidates · Question · Edit · Smoke test

## Candidates

- Inventory every color the script uses (grep the color table and each `paint` call). A candidate is a color no other segment uses.
- Offer candidates such as bold bright white, bold bright magenta; keep only those unused. In the bundled asset the used colors are cyan, magenta, blue, green, yellow, orange, red, dim, and `branch` (256-color pink, `38;5;205`).

## Question

One decision question with the grill table. Fixed criteria (weights sum to 100): contrast against the other segments 30, readability on dark and light themes 25, `NO_COLOR` still honored 15, terminal support (16-color vs 256-color vs truecolor) 20, distinct from the threshold colors (green, yellow, orange, red) 10.

Cite a source or say `unverified` for each score; terminal support cites the terminal documentation or `unverified`. Skip keeps the current branch color and ends with `Result: nothing-to-do`.

## Edit

- Color table present: set the `branch` entry (the bundled asset already has one, so the create flow replaces its value rather than adding an entry); else inline the escape.
- Replace the branch segment so `git(` and `)` keep their wrapper color and the name is `paint(<name>, bold, <chosen>)`.
- Preserve the script's quoting, trailing commas, and formatting style.
- Inline command: apply the same change to the command string, escaping per its shell.

## Smoke test

1. `smoke` with a sample session JSON that has `workspace.current_dir` pointing at a git repo: the output holds the branch name directly wrapped in bold plus the chosen escape.
2. `smoke-plain` (`NO_COLOR=1`): the output has no escape sequences and still shows `git(<name>)`.
3. Other segments: compare with the pre-edit output from the backup; only the branch name's escapes differ.
