# Decide

Recommend one option per question with a one-line reason; the user can override.

## Contents

- Fit · One job · Scope · Fields · Model and effort · Color

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
| `model`                                                  | Always asked and set; never `inherit`                                              | See `## Model and effort`                                                                     |
| `effort`                                                 | Always asked and set                                                               | See `## Model and effort`                                                                     |
| `maxTurns`                                               | Runs can loop or wander; it is the stop condition                                  | Set for loops                                                                                 |
| `isolation`                                              | The agent writes files in parallel with others: `worktree`                         | Omit otherwise                                                                                |
| `background`                                             | It should always run in the background                                             | Omit                                                                                          |
| `memory`                                                 | It should learn across sessions (adds file tools); `project` is shared through git | Omit                                                                                          |
| `skills`                                                 | A skill's full content is needed on every run (preloaded)                          | Omit                                                                                          |
| `omitClaudeMd`                                           | The delegation prompt carries everything and CLAUDE.md is noise                    | Omit                                                                                          |
| `color`                                                  | Always asked; omitted only on No color                                             | See `## Color`                                                                                |
| `permissionMode`, `mcpServers`, `hooks`, `initialPrompt` | Personal or Project agent that needs it                                            | Omit                                                                                          |

`autoCompactWindow` is a known field; never recommend it.

## Model and effort

`model`, `effort`, and `color` are asked in every create and update, in one AskUserQuestion batch; a question the input already answers is skipped. Ground each recommendation (from the job, tools, and sibling agents; never `inherit`):

1. Take the job, tools, and return shape from Clarify. Glob the target scope's agents directory, Grep `^model:`, `^effort:`, and `^color:` in the siblings, and sort each sibling into a role by its `description`.
2. Siblings of the same role agree → recommend that value and cite it ("matches 6 sibling analyzers").
3. No siblings, or they disagree → use the table below.
4. The job fits two rows → recommend the row for its hardest step (model) or the domain color over the generic one (color), and say in the reason that it was a close call.
5. Every reason cites a job, tool, or sibling fact, and names the criterion below that decided it; never recommend from the name alone.
6. Update mode → recommend the current value when the evidence supports it; otherwise recommend the better value with the reason.

Criteria for both `model` and `effort`:

- Reasoning depth: how many steps, and how interdependent.
- Cost of a miss: what a wrong result costs the parent.
- Context size: files, diff, or sources read.
- Spawn frequency and latency: fan-out and parallel runs.
- Tool power: read-only lookup against edits or Bash.
- Sibling consensus (step 2).

| Model    | Pick for                                                                                                                                                                   | Trade-off                                                                                                                         |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `haiku`  | Fixed-rule lookups, inventories, fact collection, data normalization                                                                                                       | Fastest and cheapest; enough when no judgment is needed                                                                           |
| `sonnet` | Judgment over a moderate scope: rubric scoring, analysis, drafting, docs, maintainability or test review                                                                   | Balanced cost and quality                                                                                                         |
| `opus`   | Hard multi-step reasoning where a miss is costly: correctness or security review, merge conflicts, interdependent planning, independent verification                       | Most capable of the three, slower and costlier; use only when an error costs more than the run                                    |
| `fable`  | Demanding reasoning and long-horizon agentic work, or a job where `opus` falls short (models overview: <https://platform.claude.com/docs/en/about-claude/models/overview>) | Slowest; about 2.5× `opus` pricing ($10 / $50 against $4 / $20 per MTok); recommend only when the input says `opus` is not enough |

Never recommend or write `inherit`, and never omit `model`; an input that asks for `inherit` → recommend the alias the criteria support and say why.

| Effort   | Pick for                                                                                               | Trade-off                                                    |
| -------- | ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| `low`    | Fixed-rule lookups and inventories, or spawns that are frequent or fanned out where latency matters    | Fastest and cheapest; shallow reasoning                      |
| `medium` | Bounded judgment over a moderate scope: scoring, drafting, analysis                                    | Balanced speed and depth                                     |
| `high`   | Multi-step reasoning across files where a miss is costly: correctness or security review, verification | Slower and costlier; catches more                            |
| `xhigh`  | Interdependent planning, conflict resolution, long-horizon edits                                       | Slower still; use when `high` misses cross-step dependencies |
| `max`    | Only when the input says `xhigh` is not enough                                                         | Slowest and most expensive level                             |

Question layout (each question allows at most 4 options):

- Model: `haiku`, `sonnet`, `opus`, `fable`; the recommended one first, marked "(Recommended)" with its reason; each description states the cost or capability trade-off for this job. "Other" covers a full model ID only, never `inherit`.
- Effort: the recommended level first, marked "(Recommended)" with its reason, then the two neighbouring levels with their trade-offs. "Other" covers the rest.

## Color

`color` only changes how the agent is displayed in the task list and transcript; consistent role colors let the user tell at a glance what kind of agent is running. Ground the recommendation with the steps in `## Model and effort`.

| Color    | Role                                    |
| -------- | --------------------------------------- |
| `green`  | Git, change requests, and planned edits |
| `cyan`   | Repo-fact analyzers                     |
| `yellow` | Scorers                                 |
| `purple` | Reviewers and auditors                  |
| `red`    | Security                                |
| `orange` | Spec and planning workflows             |
| `blue`   | Tests and checks                        |
| `pink`   | Research                                |

A domain color wins over the generic one: security red and test blue both beat reviewer purple.

Question layout: the recommended color with its reason, one alternate backed by evidence, **No color** (omit the field), and **Stop** (the Stop for the batch). "Other" covers any of the 8 colors.
