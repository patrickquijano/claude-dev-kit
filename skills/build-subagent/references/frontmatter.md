# Frontmatter

Sources: <https://code.claude.com/docs/en/sub-agents>, <https://code.claude.com/docs/en/plugins-reference>, the Claude Code changelog (`autoCompactWindow`). `check-agent` enforces the mechanical parts.

## Contents

- Format · Fields · Tools · Description · Don'ts

## Format

- `---` on line 1, valid YAML, a closing `---`. Otherwise Claude Code skips the file (a plugin loads it anyway, under the file name).
- `name` and `description` are required; unknown fields are ignored silently, so a misspelled field does nothing. Multi-word fields are camelCase.
- `name`: at most 256 chars, no `:`, no leading `-`, unique in its scope. The identity is `name`, not the file name.

## Fields

| Field                   | Type and values                                                                                                 | Default    | Scope note                                                               |
| ----------------------- | --------------------------------------------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------------ |
| `name`                  | string                                                                                                          | required   |                                                                          |
| `description`           | string: when to delegate, ≤200 chars                                                                            | required   |                                                                          |
| `tools`                 | allowlist; omitted = inherit all                                                                                | all        |                                                                          |
| `disallowedTools`       | denylist, applied first; an entry with a specifier removes the whole tool                                       | none       |                                                                          |
| `model`                 | `sonnet`, `opus`, `haiku`, `fable`, a full id, `inherit`                                                        | main model | order: call param, frontmatter, `CLAUDE_CODE_SUBAGENT_MODEL`, main model |
| `permissionMode`        | `default`, `acceptEdits`, `auto`, `dontAsk`, `bypassPermissions`, `plan`                                        | `default`  | ignored by plugin agents                                                 |
| `maxTurns`              | positive integer                                                                                                | none       |                                                                          |
| `skills`                | list, at most 32; full content injected at startup; a skill with `disable-model-invocation` cannot be preloaded | none       |                                                                          |
| `mcpServers`            | MCP servers scoped to the agent                                                                                 | none       | ignored by plugin agents                                                 |
| `hooks`                 | `PreToolUse`, `PostToolUse`, `Stop` scoped to the agent                                                         | none       | ignored by plugin agents                                                 |
| `memory`                | `user`, `project`, `local`; adds Read, Write, Edit and up to 200 lines / 25KB of `MEMORY.md`                    | none       |                                                                          |
| `background`            | `true` or `false`                                                                                               | `false`    |                                                                          |
| `omitClaudeMd`          | `true` or `false`                                                                                               | `false`    |                                                                          |
| `effort`                | `low`, `medium`, `high`, `xhigh`, `max`                                                                         | session    |                                                                          |
| `isolation`             | `worktree`                                                                                                      | none       |                                                                          |
| `color`                 | `red`, `blue`, `green`, `yellow`, `purple`, `orange`, `pink`, `cyan`                                            | none       |                                                                          |
| `initialPrompt`         | string, auto-submitted first turn (main-session agents)                                                         | none       | ignored by plugin agents                                                 |
| `experimental.cacheTtl` | `5m`, `1h`                                                                                                      | default    |                                                                          |
| `autoCompactWindow`     | known from the changelog only; never recommended                                                                | none       |                                                                          |

## Tools

- `tools` is the allowlist; omit it only when the agent needs every tool. Read-only agents exclude `Edit` and `Write`. List `Agent` only when the agent must spawn subagents (3 layers at most).
- Always removed from subagents, so never list them: `AskUserQuestion`, `EnterPlanMode`, `ExitPlanMode` (except under plan mode), `ScheduleWakeup`, `WaitForMcpServers`, `Workflow`; `Agent` too at the depth limit.
- Block skills by omitting `Skill` from `tools`.

## Description

- ≤200 chars; says when to delegate, starting `Use proactively to/when …`; all agent descriptions share one context budget (a warning above 15,000 tokens in total).
- Never name a skill or subagent (bare or `plugin:name`) or say `spawned by`.
- Distinct from every other agent in scope, so the parent picks the right one.

## Don'ts

- Never set a field at its default or one you cannot cite from the table.
- Never list an always-removed tool or a scope-ignored field.
- Never rely on the file name for identity.
