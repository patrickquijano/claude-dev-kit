---
name: setup-permissions
description: Configure user-scoped Claude Code allow, ask, and deny permission rules for the commands this repository uses and the MCP tools the session lists. Classify commands and tools as allow (safe), ask (recoverable-destructive), or deny (host-harming, privileged), and merge them safely into the user settings file. Use only when the user explicitly asks to set up, configure, add, or tidy Claude Code permissions, allow, ask, or deny rules, or fewer permission prompts, e.g. "set up my permissions", "add allow rules for this repo", "deny sudo in Claude Code". Do not use on your own after finishing a task.
argument-hint: '[optional extra commands or notes]'
allowed-tools: Bash(git rev-parse *) Bash(printenv CLAUDE_CONFIG_DIR) Bash(printenv OS) Bash(uname) Bash(jq empty *) Bash(claude mcp list)
---

# Setup Permissions

Input: $ARGUMENTS

## Rules

- Policy, syntax, baseline lists, and MCP rules: `${CLAUDE_SKILL_DIR}/catalog.md`. Follow it; never copy its rules here.
- Target only the user settings file: `$CLAUDE_CONFIG_DIR/settings.json` when set, else `~/.claude/settings.json` (`%USERPROFILE%\.claude\settings.json` on Windows). Never `settings.local.json` (read only in the home directory) and never project or managed files.
- Never remove, reorder, or rewrite an existing key or rule. Append only new rules to `permissions.allow`, `permissions.ask`, `permissions.deny`.
- Never write a wildcard-only or tool-wide rule (`Bash`, `Bash(*)`, `Bash(* x)`, a server-wide `mcp__<server>` or `mcp__<server>__*`). Each MCP tool gets one exact rule. Every Bash command (except the single rules in `catalog.md` Syntax) gets both its exact rule and its wildcard rule (`Bash(npm)` and `Bash(npm *)`), because auto mode may not recognize wildcard-only coverage.
- Narrowest safe pattern: never allow shells, interpreters, command chaining, arbitrary scripts, runners of arbitrary code, or privilege escalation. A command that cannot be classified safely → ask.
- Git-recoverable damage (`rm`, `git reset --hard`, `git clean`) → ask, never deny. Deny only host-harming and privileged commands, anchored at the program name, so no deny blocks a legitimate dev command; deny beats allow everywhere.
- Settings file with comments, invalid JSON, or a non-object `permissions` → stop; never overwrite it.
- User interaction (AskUserQuestion) only here; `cdk:permission-analyzer` cannot ask, so its `Questions:` are asked here. Batch conflicts into calls of at most 4 questions, 2–4 options each; recommended first with its reason.
- Caps: step 2 re-spawns the analyzer at most once; step 6 validate-fix at most 3 attempts. Every question is asked once.
- Not chained by `cdk:setup-project`: it writes user scope, which every project shares.
- A Stop answer (step 7) → `Result: cancelled`, `Resolution: not run (cancelled)`, `Stopped: <step>: <reason>`, end. Any other stop or failure after candidates exist (an invalid settings file stays a pre-flight stop; the step 6 validate-cap stop) → run step 9 once on what is left, without re-entering step 6, then print the Output with `Stopped: <step>: <reason>` and end.
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/fallbacks.md`.
- Final step: follow `${CLAUDE_SKILL_DIR}/../build-skill/resolve-findings.md` (scope: edit; sources: `Validation: fail`, `Conflicting:`, `Skipped:`, `Reclassified:`, analyzer `Gaps:`).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `setup-permissions`.

## Workflow

1. **Pre-flight.** Repo root = `git rev-parse --show-toplevel`, else cwd. Platform = Windows when `printenv OS` prints `Windows_NT`, else `uname` (`Darwin` → macOS, `Linux` → Linux). Settings dir = `printenv CLAUDE_CONFIG_DIR` when it prints a path (a failed command means unset), else `~/.claude` (`%USERPROFILE%\.claude` on Windows). Target = `<dir>/settings.json`. Note that managed settings, if any, still outrank it.
2. **Analyze.** Spawn `cdk:permission-analyzer` with the repo root and `$ARGUMENTS`. Ask its `Questions:`, then re-spawn once with the answers appended to the prompt as extra notes. `Known issue:` lines → known-issues rule.
3. **MCP inventory.** Never from the analyzer or from memory. Servers = `claude mcp list` (a failed command → none known). Tools = every `mcp__<server>__<tool>` name in this session's own tool list, including deferred tools listed by name, copied exactly. A listed server with no listed tool (failed, pending approval, needs authentication) → `Skipped: <server> — unavailable`; never guess its tools. Servers or tools that are not listed are not classified.
4. **Classify.** Apply `catalog.md` to the analyzer's commands plus the baseline for the platform, and its `## MCP` section to each listed MCP tool. Use `Package managers` to scope the read-only package-manager allows, `Installed` to skip programs that are missing, and `Gaps` as `skipped` notes. Produce candidate rules per list, each with its reason: `Bash`/`PowerShell` commands as exact + wildcard pairs, each MCP tool as one exact rule. `Destructive`, `Interpreter/exec`, and `Privileged` entries, and anything unclassifiable → ask or deny per the catalog. Record `reclassified` = a command that looks allowable but the catalog moved to ask or deny, with the reason.
5. **Merge.** Read the target (missing → `{}`; see Rules for invalid). Compare candidates with existing `permissions.allow|ask|deny`, treating `Bash(x:*)` as `Bash(x *)`:
   - already present → `retained`; skipped as a duplicate.
   - same rule in a different list → `conflicting`; keep the existing, add nothing.
   - existing allow that a new ask or deny covers → keep it; the stricter list wins at evaluation; report it `conflicting`.
   - existing deny that blocks a detected dev command → `conflicting`; AskUserQuestion: Keep it (Recommended; deny wins everywhere) | Remove that rule.
   - existing unsafe allow (`Bash(*)`, a shell, `sudo`) → AskUserQuestion: Move to deny or ask per the catalog (Recommended) | Keep it.
   - existing server-wide MCP allow (`mcp__<server>`, `mcp__<server>__*`) that a new MCP ask covers → keep it; report `conflicting` (ask wins). Existing server-wide MCP deny → add no allow or ask for that server's tools; report `conflicting`.
   - Candidate with no safe pattern → `skipped` with the reason.

   Build the merged object in memory: append new rules at each list's end, keep every other key and order, add `$schema` (`https://json.schemastore.org/claude-code-settings.json`) only when absent.

6. **Validate.** Write the merged JSON to the scratchpad and run `jq empty <file>` (`jq` missing → ask the user to install it, or approve a one-off `node -e` JSON parse). Then check:
   - top-level object; the three lists are arrays of strings.
   - each rule is `Tool(specifier)` with a known tool name (`Bash`, `PowerShell`, `Edit`, `Read`, …); no bare tool name, no leading `*`; `mcp__` rules are checked by the MCP bullet below instead.
   - every `Bash` and `PowerShell` rule has both its exact and wildcard form, except the single rules in `catalog.md` Syntax.
   - every new MCP rule matches `^mcp__[A-Za-z0-9_-]+__[A-Za-z0-9_-]+$` and names a tool listed in step 3; no parentheses, no wildcard.
   - no duplicates within or across lists; no new allow shadowed by a deny of the same program.

   Fail → fix and re-check (cap in Rules); still failing → run step 9 on the failed checks without re-entering this step (nothing was written, so step 9 edits nothing), then print the Output with `Stopped: 6: <reason>` and end.

7. **Confirm.** Print the target path and a table: added allow, ask, deny; retained; skipped; conflicting; reclassified. AskUserQuestion: Write settings (Recommended) | Stop. Nothing added → skip this and step 8, `Result: nothing-to-do`, and run step 9 on `Skipped:`, `Conflicting:`, `Reclassified:` items (else `Resolution: none`).
8. **Write.** Write the validated JSON to the target, creating the directory if missing. The write touches a protected path, so Claude Code prompts. Re-read the file and repeat the step 6 checks on it; a failure → run step 9 on the failed checks, then print the Output with `Stopped: 8: <reason>` and end.
9. **Resolve findings.** Per resolve-findings.md. Fix only rules this run added, then re-run the step 6 validation after any edit; never remove, reorder, or rewrite an existing rule. Entries the user already decided in a question are `accepted`.
10. **Report** the output below (`Settings: unchanged` when nothing was written), plus: `claude doctor` lists any rule Claude Code rejected, and `/permissions` shows the active rules.

## Output

```text
Settings: <path> (<created | updated | unchanged>)
Platform: <macOS | Linux | Windows>
MCP: <n servers, n tools classified> | none
Added: allow <n>, ask <n>, deny <n>
Allow: <rule>, … | none
Ask: <rule>, … | none
Deny: <rule>, … | none
Retained: <n> (<rule>, …) | none
Skipped: <rule — reason>, … | none
Conflicting: <rule — resolution>, … | none
Reclassified: <command: from → to — reason>, … | none
Validation: pass | fail: <reason>
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
