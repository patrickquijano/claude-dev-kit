# Review loop

Details step 7 (**Review loop**). Commands run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`.

Run the `format.md` `## Review checklist` against the file, the diffs, and `tags`. For each failing item: safe fix → apply, then re-run the whole checklist; needs unavailable information, touches a released section, or is ambiguous → AskUserQuestion (≤4 options, recommended first with justification, Omit or Stop where safe). Last check: re-derive entries from the same inputs; any edit would result → fix and re-run. Each full checklist run = 1 round; cap checked after each; cap hit → `Result: stopped`.
