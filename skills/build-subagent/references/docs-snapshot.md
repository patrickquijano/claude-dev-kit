# Docs snapshot

Source: <https://code.claude.com/docs/en/subagents> (full page, read to its end), also <https://code.claude.com/docs/en/plugins-reference>. Facts only, paraphrased. `check-agent` mirrors the field, enum, and removed-tool lists, except `experimental.cacheTtl` and the `autoCompactWindow` range.

Fetched: 2026-10-24

Freshness: fetched over 30 days ago, or the user asks → refresh with `WebFetch` on the first URL; unreachable or no `WebFetch` → label every rule that depends on a changed fact "Unverified (baseline dated <the `Fetched:` date>)": omit it and list it in `Unverified:`.

## Contents

- Format · Fields · Version gates · Tools · Permission modes · Scopes and precedence · Plugin restrictions · Trust and environment · Changed facts · Unverified

## Format

- `---` on line 1, valid YAML, a closing `---`; the body is the whole system prompt. `name` and `description` are required; unknown fields are ignored silently. Multi-word fields are camelCase. Confirmed.
- `name`: at most 256 chars, no `:`, no leading `-`; the identity is `name`, not the file name. Confirmed.
- Loading rules differ by scope. Project, user, managed, and `--add-dir` directories: no `name`, or `---` not on line 1 → silently treated as a doc, not an agent; a bad name, no description, or bad YAML → skipped with an error in the debug log. Plugin agents with no `name` or unparseable YAML still load under their file name. Changed.

## Fields

| Field                   | Type and values                                                                                                 | Default    | Scope note                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------ |
| `name`                  | string                                                                                                          | required   |                                                                          |
| `description`           | string: when to delegate; advised ≤200 chars                                                                    | required   |                                                                          |
| `tools`                 | allowlist; omitted = inherit all; `Agent(type)` is not valid in a subagent's list                               | all        |                                                                          |
| `disallowedTools`       | denylist, applied first; an entry with a specifier removes the whole tool                                       | none       |                                                                          |
| `model`                 | `sonnet`, `opus`, `haiku`, `fable`, a full id, `inherit`                                                        | main model | order: call param, frontmatter, `CLAUDE_CODE_SUBAGENT_MODEL`, main model |
| `permissionMode`        | `default`, `manual` (alias of `default`), `acceptEdits`, `auto`, `dontAsk`, `bypassPermissions`, `plan`         | `default`  | ignored by plugin agents                                                 |
| `maxTurns`              | positive integer                                                                                                | none       |                                                                          |
| `skills`                | list, at most 32; full content injected at startup; a skill with `disable-model-invocation` cannot be preloaded | none       |                                                                          |
| `mcpServers`            | MCP servers scoped to the agent                                                                                 | none       | ignored by plugin agents                                                 |
| `hooks`                 | `PreToolUse`, `PostToolUse`, `Stop` scoped to the agent                                                         | none       | ignored by plugin agents                                                 |
| `memory`                | `user`, `project`, `local`; adds Read, Write, Edit and up to 200 lines / 25KB of `MEMORY.md`                    | none       |                                                                          |
| `background`            | `true` or `false`                                                                                               | `false`    |                                                                          |
| `omitClaudeMd`          | `true` or `false`                                                                                               | `false`    |                                                                          |
| `effort`                | `low`, `medium`, `high`, `xhigh`, `max`; `CLAUDE_CODE_EFFORT_LEVEL` overrides it                                | session    |                                                                          |
| `isolation`             | `worktree`                                                                                                      | none       |                                                                          |
| `color`                 | `red`, `blue`, `green`, `yellow`, `purple`, `orange`, `pink`, `cyan`; display only                              | none       |                                                                          |
| `initialPrompt`         | string, auto-submitted first turn; used only by main-session agents                                             | none       | ignored by plugin agents                                                 |
| `experimental.cacheTtl` | `5m`, `1h`                                                                                                      | default    |                                                                          |
| `autoCompactWindow`     | plain integer 100000–1000000 (`200k` reads as 200); never recommended                                           | none       | no effect when the session runs as the agent                             |

## Version gates

| Gate     | Feature                                                                                      |
| -------- | -------------------------------------------------------------------------------------------- |
| v2.1.218 | Frontmatter hooks in untrusted folders are skipped                                           |
| v2.1.233 | `claude plugin validate <dir>`                                                               |
| v2.1.238 | Inline `mcpServers` (needs trust of the agent file's own folder)                             |
| v2.1.242 | `/tasks` shows the model                                                                     |
| v2.1.246 | `maxTurns` returns partial output                                                            |
| v2.1.248 | `experimental.cacheTtl`                                                                      |
| v2.1.257 | `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1`                                                         |
| v2.1.267 | `bypassPermissions` under a parent in `default` or `dontAsk`                                 |
| v2.1.271 | `omitClaudeMd`                                                                               |
| v2.1.296 | `autoCompactWindow`; debug log message `invalid autoCompactWindow` when the value is ignored |
| v2.1.299 | A subagent name survives a restart after one send by ID                                      |
| v2.1.302 | Fork mode on by default                                                                      |

A field used on a Claude Code older than its gate is "Unverified" for that user; `claude --version` gives the local version.

## Tools

- `tools` is the allowlist; omit it only when the agent needs every tool. `Agent` only when the agent must spawn subagents (3 layers at most). An empty list leaves the agent no tools. Confirmed.
- Always removed from subagents, so never listed: `AskUserQuestion`, `EndConversation`, `EnterPlanMode`, `ExitPlanMode` (except under plan mode), `ScheduleWakeup`, `WaitForMcpServers`, `Workflow`; `Agent` too at the depth limit. Confirmed.
- Omit `Skill` from `tools` to block on-demand skill loading. Confirmed.
- MCP tools: `mcp__<server>__<tool>`; for a server name containing `__`, list each tool individually, not the whole server. Changed.
- Background runs get a filtered tool set (the docs list it under Available tools). Confirmed.

## Permission modes

`default` (alias `manual`), `acceptEdits`, `auto`, `dontAsk`, `bypassPermissions`, `plan`. Plugin agents ignore the field. A parent in `plan` keeps the subagent in plan. Changed.

## Scopes and precedence

- Same `name`: managed settings, then `--agents`, then project, personal, plugin. A project agent resolves nearest to the working directory; two same-name files in one tree load in an undocumented order, so avoid them. Confirmed.
- All scopes are scanned recursively; a plugin subfolder joins the id (`<plugin>:sub:name`). Personal and project edits load within seconds; a new `agents` directory needs a restart. Confirmed.

## Plugin restrictions

Plugin agents ignore `permissionMode`, `hooks`, `mcpServers`, `initialPrompt`; an agent needing one is Personal or Project. Confirmed; `initialPrompt` is also main-session only.

## Trust and environment

- Inline `mcpServers` need trust of the agent file's own folder (v2.1.238); frontmatter `hooks` in an untrusted folder are skipped (v2.1.218); user-scope hooks need no trust. Changed.
- `CLAUDE_CODE_SUBAGENT_MODEL` overrides `model` unless `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1` is set. Changed.

## Changed facts

Facts that differ from the earlier baseline: plugin load rules, `initialPrompt` scope, MCP names with `__`, plan-mode inheritance, folder trust, the version gates above, `CLAUDE_CODE_EFFORT_LEVEL`, the background tool set, name persistence after a restart (v2.1.299), and fork mode (v2.1.302). Everything else in this file was Confirmed unchanged.

## Unverified

- Which agent wins when two descriptions overlap: the docs only advise descriptions that single out one agent. Never claim a resolution rule; state the overlap as "Unverified".
- Offline or without `WebFetch`: every Changed fact above is "Unverified (baseline dated <the `Fetched:` date>)".
