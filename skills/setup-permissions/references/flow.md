# Flow

Detail for the Workflow steps in `SKILL.md`. Commands: `${CLAUDE_SKILL_DIR}/references/commands.md`.

## Contents

- Pre-flight · Analyze · MCP inventory · Classify · Merge · Validate · Write · Fix loop

## Pre-flight

- Platform: Windows when `os-env` prints `Windows_NT`, else `uname` (`Darwin` = macOS, `Linux` = Linux).
- Settings dir: `config-dir` output when it prints a path (a failed command = unset), else `~/.claude` (`%USERPROFILE%\.claude` on Windows). Target = `<dir>/settings.json`. Managed settings, if any, still outrank it.

## Analyze

Spawn `cdk:permission-analyzer` with the repo root and `$ARGUMENTS` as extra notes. It cannot ask, so ask its `Questions:` here (batches of at most 4, 2-4 options each, recommended first with its reason), then re-spawn once with the answers appended as extra notes. Ignore its `Known issue:` lines. Its `Gaps:` become `skipped` notes.

## MCP inventory

- Never from the analyzer or from memory. Servers = `mcp-list` (a failed command = none known).
- Tools = every `mcp__<server>__<tool>` name in this session's own tool list, including deferred tools listed by name, copied exactly.
- A listed server with no listed tool (failed, pending approval, needs authentication) = `Skipped: <server> - unavailable`; never guess its tools. Unlisted servers and tools are not classified.

## Classify

- Apply `${CLAUDE_SKILL_DIR}/references/catalog.md` to the analyzer's commands plus the baseline for the platform, and its `## MCP` section to each listed MCP tool.
- Use `Package managers` to scope the read-only package-manager allows and `Installed` to skip missing programs.
- Candidates per list, each with its reason: `Bash` and `PowerShell` commands as exact + wildcard pairs, each MCP tool as one exact rule.
- `Destructive`, `Interpreter/exec`, `Privileged` entries and anything unclassifiable go to ask or deny per the catalog.
- `reclassified` = a command that looks allowable but the catalog moved to ask or deny, with the reason.

## Merge

Read the target (missing = `{}`; comments, invalid JSON, or a non-object `permissions` = stop). Compare candidates with existing `permissions.allow|ask|deny`, treating `Bash(x:*)` as `Bash(x *)`:

- already present: `retained`; skipped as a duplicate.
- same rule in a different list: `conflicting`; keep the existing, add nothing.
- existing allow that a new ask or deny covers: keep it (the stricter list wins at evaluation); report `conflicting`.
- existing deny that blocks a detected dev command: `conflicting`; AskUserQuestion: Keep it (Recommended; deny wins everywhere) | Remove that rule.
- existing unsafe allow (`Bash(*)`, a shell, `sudo`): AskUserQuestion: Move to deny or ask per the catalog (Recommended) | Keep it.
- existing server-wide MCP allow (`mcp__<server>`, `mcp__<server>__*`) that a new MCP ask covers: keep it; report `conflicting` (ask wins). Existing server-wide MCP deny: add no allow or ask for that server's tools; report `conflicting`.
- candidate with no safe pattern: `skipped` with the reason.

Build the merged object in memory: append new rules at each list's end, keep every other key and its order, add `$schema` (`https://json.schemastore.org/claude-code-settings.json`) only when absent.

## Validate

Write the merged JSON to the scratchpad and run `validate-json` (`jq` missing = ask the user to install it, or approve a one-off `node -e` JSON parse). Then check:

- top-level object; the three lists are arrays of strings.
- each rule is `Tool(specifier)` with a known tool name (`Bash`, `PowerShell`, `Edit`, `Read`, ...); no bare tool name, no leading `*`; `mcp__` rules follow the MCP bullet.
- every `Bash` and `PowerShell` rule has both its exact and wildcard form, except the single rules in `catalog.md` Syntax.
- every new MCP rule matches `^mcp__[A-Za-z0-9_-]+__[A-Za-z0-9_-]+$` and names a tool listed at MCP inventory; no parentheses, no wildcard.
- no duplicates within or across lists; no new allow shadowed by a deny of the same program.

## Write

Write the validated JSON to the target, creating the directory if missing; the path is protected, so Claude Code prompts. Re-read the file and repeat the Validate checks on it.

## Fix loop

Run once on what is left, never re-entering Validate more than the cap allows: fix only rules this run added (never remove, reorder, or rewrite an existing rule), re-run the Validate checks after each edit, at most 2 rounds. Entries the user already decided in a question are accepted. Whatever remains (`Validation: fail`, `Conflicting`, `Skipped`, `Reclassified`, analyzer `Gaps`) is listed in `Open:` with its impact and recommended fix.
