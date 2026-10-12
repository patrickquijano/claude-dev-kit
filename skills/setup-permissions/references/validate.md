Details step 6 (Validate). Commands: `${CLAUDE_SKILL_DIR}/references/commands.md`.

Write the merged JSON to the scratchpad and run `validate-json` (`jq` missing → ask the user to install it, or approve a one-off `node -e` JSON parse). Then check:

- top-level object; the three lists are arrays of strings.
- each rule is `Tool(specifier)` with a known tool name (`Bash`, `PowerShell`, `Edit`, `Read`, …); no bare tool name, no leading `*`; `mcp__` rules are checked by the MCP bullet below instead.
- every `Bash` and `PowerShell` rule has both its exact and wildcard form, except the single rules in `catalog.md` Syntax.
- every new MCP rule matches `^mcp__[A-Za-z0-9_-]+__[A-Za-z0-9_-]+$` and names a tool listed in step 3; no parentheses, no wildcard.
- no duplicates within or across lists; no new allow shadowed by a deny of the same program.
