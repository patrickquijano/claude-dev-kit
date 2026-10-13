# Decide

Recommend one option per question with a one-line reason; the user can override.

## Contents

- Fit · One job · Scope · Fields

## Fit

| Signal                                                                                              | Recommend         | Why                                             |
| --------------------------------------------------------------------------------------------------- | ----------------- | ----------------------------------------------- |
| Self-contained work, verbose output the parent does not need, returns a summary                     | Subagent          | Own context; only the final message returns     |
| Needs its own tool limits, or independent work that can run in parallel                             | Subagent          | `tools` and parallel spawns                     |
| Back-and-forth with the user, much context shared across phases, a quick targeted edit, low latency | None: main thread | A subagent starts fresh and must gather context |
| Reference knowledge or a workflow that runs inline                                                  | None: a skill     | A skill adds to the main context on demand      |
| A rule that must hold every time with no judgment                                                   | None: a hook      | Hooks are guarantees; prompts are requests      |

Agents cost about 4× a chat's tokens and multi-agent about 15×; spawn only when the gain is worth it.

## One job

- One agent, one job, and a return shape the parent can use. A job is one verb on one object; "and" or "also" in the purpose, or two unrelated return shapes, signals several.
- Several jobs found → ask Split | Pick one | Stop, never build a multi-job agent:

| Signal                                                      | Recommend | Why                                                          |
| ----------------------------------------------------------- | --------- | ------------------------------------------------------------ |
| Jobs are independent and each has its own return shape      | Split     | Separate agents run in parallel and keep tools minimal       |
| One job is the goal and the rest are steps that serve it    | Pick one  | Steps belong in `## Task`, not in a second agent             |
| The jobs need different tools, models, or read-only vs edit | Split     | A mixed allowlist breaks least privilege                     |
| The input cannot say which job matters most                 | Stop      | Guessing builds the wrong agent; ask the user to narrow down |

- Split → build the first agent now and list the rest in `Gaps:`; Pick one → drop the others and list them in `Gaps:`.

### Name

- Name the agent as an actor: a noun for who does the job (`code-reviewer`, `change-analyzer`), never the action (`review-code`, `analyze-changes`) or a gerund (`reviewing`). Actions name skills; actors name agents.
- A requested name that is an action → ask Rename | Keep, recommending Rename with the actor form (`review-code` → `code-reviewer`).
- Lowercase, hyphen-separated; no `:`, no leading `-`; the file stem matches `name`.

## Scope

| Signal                                                                              | Recommend                                     | Path                                                         |
| ----------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------ |
| Repo-specific; teammates should get it through git                                  | Project                                       | `<repo>/.claude/agents/<name>.md`                            |
| Your own cross-project habit                                                        | Personal                                      | `~/.claude/agents/<name>.md`                                 |
| `.claude-plugin/plugin.json` at the target root, or an agent meant for distribution | Plugin                                        | `<plugin root>/agents/<name>.md`, invoked `@<plugin>:<name>` |
| No signal                                                                           | Project when cwd is a git repo, else Personal |                                                              |

- Precedence for the same `name`: managed settings, then `--agents`, then project, personal, plugin. All are scanned recursively; a plugin subfolder joins the id (`<plugin>:sub:name`).
- Personal and project edits load within seconds; a new `agents` directory needs a restart; plugin edits need `/reload-plugins`.
- Plugin agents ignore `permissionMode`, `hooks`, `mcpServers`, `initialPrompt`; needing one → Personal or Project.

## Fields

Set a field only on a signal; omit every field at its default.

| Field                                                    | Set when                                                                           | Recommend                                                                                     |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `tools`                                                  | Always: an explicit minimal allowlist                                              | Read-only `Read, Grep, Glob`; tests `Bash, Read, Grep`; edits `Read, Edit, Write, Grep, Glob` |
| `disallowedTools`                                        | Inheriting all tools but one must go (a specifier removes the whole tool)          | Omit                                                                                          |
| `model`                                                  | Cheap lookup → `haiku`; hard reasoning → `opus`; otherwise follow the main model   | Omit or `haiku`                                                                               |
| `effort`                                                 | The task needs more or less reasoning than the session                             | Omit                                                                                          |
| `maxTurns`                                               | Runs can loop or wander; it is the stop condition                                  | Set for loops                                                                                 |
| `isolation`                                              | The agent writes files in parallel with others: `worktree`                         | Omit otherwise                                                                                |
| `background`                                             | It should always run in the background                                             | Omit                                                                                          |
| `memory`                                                 | It should learn across sessions (adds file tools); `project` is shared through git | Omit                                                                                          |
| `skills`                                                 | A skill's full content is needed on every run (preloaded)                          | Omit                                                                                          |
| `omitClaudeMd`                                           | The delegation prompt carries everything and CLAUDE.md is noise                    | Omit                                                                                          |
| `color`                                                  | The user wants a display color                                                     | Omit                                                                                          |
| `permissionMode`, `mcpServers`, `hooks`, `initialPrompt` | Personal or Project agent that needs it                                            | Omit                                                                                          |

`autoCompactWindow` is a known field; never recommend it.
