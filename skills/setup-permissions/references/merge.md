Details step 5 (Merge).

Read the target (missing → `{}`; see Rules for invalid). Compare candidates with existing `permissions.allow|ask|deny`, treating `Bash(x:*)` as `Bash(x *)`:

- already present → `retained`; skipped as a duplicate.
- same rule in a different list → `conflicting`; keep the existing, add nothing.
- existing allow that a new ask or deny covers → keep it; the stricter list wins at evaluation; report it `conflicting`.
- existing deny that blocks a detected dev command → `conflicting`; AskUserQuestion: Keep it (Recommended; deny wins everywhere) | Remove that rule.
- existing unsafe allow (`Bash(*)`, a shell, `sudo`) → AskUserQuestion: Move to deny or ask per the catalog (Recommended) | Keep it.
- existing server-wide MCP allow (`mcp__<server>`, `mcp__<server>__*`) that a new MCP ask covers → keep it; report `conflicting` (ask wins). Existing server-wide MCP deny → add no allow or ask for that server's tools; report `conflicting`.
- Candidate with no safe pattern → `skipped` with the reason.

Build the merged object in memory: append new rules at each list's end, keep every other key and order, add `$schema` (`https://json.schemastore.org/claude-code-settings.json`) only when absent.
