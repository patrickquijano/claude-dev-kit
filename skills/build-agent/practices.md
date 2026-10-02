# Subagent practices

Shared by `cdk:build-agent` and `cdk:build-skill` when they draft `agents/<name>.md`. Source: <https://code.claude.com/docs/en/sub-agents>.

## Fit

- Subagent fits when the work is self-contained, returns a summary, produces verbose output the parent does not need, needs its own tool limits, or runs in parallel with other work.
- Main conversation or a skill fits better when the task needs back-and-forth, shares a lot of context across phases, is a quick targeted change, or is latency-sensitive (a subagent starts fresh and must gather context).

## Location

- Personal `~/.claude/agents/`, project `.claude/agents/`, or plugin `agents/`. All are scanned recursively; among file scopes, same `name` at a higher priority wins (project over personal over plugin); managed settings and `--agents` rank above all.
- Plugin subfolders become part of the identifier (`agents/review/x.md` → `<plugin>:review:x`); project and personal subfolders do not.
- Plugin agents ignore `hooks`, `mcpServers`, `permissionMode`, and `initialPrompt`. Need them → personal or project scope.
- A new `agents` directory created mid-session loads only after a restart; personal and project edits load within seconds; plugin edits need `/reload-plugins`.

## Frontmatter

Only `name` and `description` are required. Unknown keys are ignored silently, so spell camelCase fields exactly. Omit every field at its default.

- `name`: unique in its scope, kebab-case, no `:`, not starting with `-`. A bad name or missing `description` makes Claude Code skip the file silently.
- `description`: when to delegate, in one or two short sentences; all agent descriptions share one context budget (startup warning above 15,000 tokens). Add "use proactively" only when Claude should delegate on its own. Agent spawned by a skill → end with `Spawned by the <skill> skill; do not use directly.`.
- `tools`: minimal allowlist; omitted = every tool available to subagents. `disallowedTools` is a denylist applied first; an entry with a specifier such as `Bash(git push *)` removes the whole tool, so use a settings deny rule to block one command. List `Agent` only when the agent must spawn its own subagents (max 3 layers by default). Block skill use: omit `Skill` from a `tools` allowlist or add it to `disallowedTools`.
- Subagents never get `AskUserQuestion`, `EnterPlanMode`, or `Workflow`. Background subagents (the default in interactive sessions) keep only `Read`, `Grep`, `Glob`, `LSP`, `Bash`, `PowerShell`, `Edit`, `Write`, `NotebookEdit`, `WebFetch`, `WebSearch`, `TodoWrite`, `Skill`, `ToolSearch`, `EnterWorktree`, `ExitWorktree`, `Monitor`, `TaskStop`, `SendMessage`, `Artifact`, and MCP tools; other built-ins drop silently.
- `model`: omit to follow the default order (per-call parameter, frontmatter, `CLAUDE_CODE_SUBAGENT_MODEL`, main model). Set `haiku` for cheap lookups, `inherit` when it must match the main model, a stronger alias only for hard reasoning.

Optional fields, each only when the task signals it:

| Field            | Set when                                                                                                                                                               |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `effort`         | Task needs more or less reasoning than the session (`low` … `max`; depends on model).                                                                                  |
| `maxTurns`       | Runs can loop or wander; the limit returns partial output that can be resumed.                                                                                         |
| `isolation`      | `worktree` for agents that edit code in parallel with others.                                                                                                          |
| `background`     | `true` to always run in the background, even when Claude wants the result first.                                                                                       |
| `memory`         | Agent should learn across sessions: `project` (recommended, shared via git), `local`, or `user`. Adds `Read`, `Write`, `Edit`, so it conflicts with a read-only agent. |
| `skills`         | Agent needs a skill's full content at startup; never a skill with `disable-model-invocation: true`.                                                                    |
| `omitClaudeMd`   | `true` when the delegation prompt carries everything and CLAUDE.md files are noise.                                                                                    |
| `color`          | User wants a display color (`red`, `blue`, `green`, `yellow`, `purple`, `orange`, `pink`, `cyan`).                                                                     |
| `permissionMode` | Personal/project agent needs its own mode; ignored when the main session is in `bypassPermissions`, `acceptEdits`, or auto.                                            |
| `mcpServers`     | Personal/project agent needs MCP servers the main session should not load.                                                                                             |
| `hooks`          | Personal/project agent needs lifecycle hooks scoped to it.                                                                                                             |
| `initialPrompt`  | Personal/project agent runs as the main session (`--agent`) and needs an auto-submitted first turn.                                                                    |

## Body

The body is the whole system prompt. The agent gets only it, environment details, the delegation prompt, CLAUDE.md files, git status, and preloaded `skills`: no conversation history, no auto memory, no output style.

- First line: role and hard limits (for example "Never edit files.").
- `## Task`: numbered steps; step 1 names every input it reads from the delegation prompt, so the parent knows what to pass.
- Restate any rule the agent needs that CLAUDE.md does not already carry.
- Read-only by default; missing information → return a question for the parent to ask the user.
- `## Return`: concise fixed structure. The parent sees only the final message, so put every field the parent uses there and nothing else.
