---
name: setup-permissions
description: Configures user-scoped allow, ask, and deny permission rules for the repo's commands and the session's MCP tools. Use only when the user explicitly asks to set up permissions or reduce prompts.
argument-hint: '[optional extra commands or notes]'
allowed-tools: Bash(git rev-parse *) Bash(printenv CLAUDE_CONFIG_DIR) Bash(printenv OS) Bash(uname) Bash(jq empty *) Bash(claude mcp list)
---

# Setup Permissions

Input: $ARGUMENTS

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `commands.md` row.

## Rules

- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Policy, syntax, baseline lists, and MCP rules live in `${CLAUDE_SKILL_DIR}/references/catalog.md`; follow it, never copy it here.
- Target only the user settings file: `$CLAUDE_CONFIG_DIR/settings.json` when set, else `~/.claude/settings.json`. Never `settings.local.json`, project, or managed files.
- Never remove, reorder, or rewrite an existing key or rule; append new rules to `permissions.allow`, `permissions.ask`, `permissions.deny` only.
- Never write a wildcard-only or tool-wide rule (`Bash`, `Bash(*)`, `Bash(* x)`, `mcp__<server>`, `mcp__<server>__*`). Each MCP tool gets one exact rule; every Bash command gets its exact and wildcard pair (`Bash(npm)`, `Bash(npm *)`) except the single rules in `catalog.md` Syntax.
- Narrowest safe pattern: never allow shells, interpreters, chaining, arbitrary scripts, code runners, or privilege escalation; an unclassifiable command goes to ask.
- Git-recoverable damage (`rm`, `git reset --hard`, `git clean`) goes to ask, never deny. Deny only host-harming and privileged commands, anchored at the program name.
- Settings file with comments, invalid JSON, or a non-object `permissions` = stop; never overwrite it.
- Ask only here (`cdk:permission-analyzer` cannot): batches of at most 4 questions, 2-4 options each, recommended first with its reason. AskUserQuestion unavailable = ask in plain chat; unattended = take the recommendation.
- Caps: re-spawn the analyzer at most once; validate-fix at most 3 attempts; fix loop at most 2 rounds. Every question is asked once.
- Not chained by `cdk:setup-project`: it writes user scope, which every project shares.
- Stop answer at Confirm = `Result: cancelled`. Any other stop after candidates exist: run the fix loop once (no new Validate round), then print the Output with `Stopped:` set.
- Write unavailable: print the validated JSON and the target path, `Result: stopped`.

## Workflow

1. **Pre-flight.** Repo root from Context (`<none>` = cwd); platform, settings dir, and target per `${CLAUDE_SKILL_DIR}/references/flow.md` `## Pre-flight`.
2. **Analyze.** Spawn `cdk:permission-analyzer` with the repo root and `$ARGUMENTS`; ask its `Questions:`, re-spawn once (`## Analyze`).
3. **MCP inventory.** Servers via `mcp-list`, tools from this session's own list only (`## MCP inventory`).
4. **Classify.** Apply `catalog.md` to commands, baseline, and MCP tools into candidate rules (`## Classify`).
5. **Merge.** Compare with the existing lists, append new rules, ask on unsafe or blocking existing ones (`## Merge`).
6. **Validate.** Write to the scratchpad, run `validate-json`, check shapes; fail = fix, cap in Rules (`## Validate`).
7. **Confirm.** Print the target and a table (added, retained, skipped, conflicting, reclassified). AskUserQuestion: Write settings (Recommended) | Stop. Nothing added = `Result: nothing-to-do`, skip to step 9.
8. **Write.** Write the file, re-read it, repeat the checks (`## Write`).
9. **Report.** Run the fix loop on leftovers (`## Fix loop`), print the Output, and note that `claude doctor` lists rejected rules and `/permissions` shows the active ones.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For the step details (pre-flight, analyze, MCP, classify, merge, validate, write, fix loop), see `${CLAUDE_SKILL_DIR}/references/flow.md`.
- For rule syntax, the allow, ask, never-allow, and deny lists, and MCP classification, see `${CLAUDE_SKILL_DIR}/references/catalog.md`.

## Output

```text
Settings: <path> (<created | updated | unchanged>)
Platform: <macOS | Linux | Windows>
MCP: <n servers, n tools classified> | none
Added: allow <n>, ask <n>, deny <n>
Allow: <rule>, ... | none
Ask: <rule>, ... | none
Deny: <rule>, ... | none
Retained: <n> (<rule>, ...) | none
Skipped: <rule - reason>, ... | none
Conflicting: <rule - resolution>, ... | none
Reclassified: <command: from -> to - reason>, ... | none
Validation: pass | fail: <reason>
Open: <item: impact; recommended fix>, ... | none
Next: /cdk:commit-changes | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
