# Interview

Steps 3–6 of `SKILL.md` (plan mode, Gate 2): ask only what the input and repo cannot answer, then gate the write on a confirmed brief. Rules for the built agent: `agent-checklist.md`; field facts: `docs-snapshot.md`.

## Contents

- Plan mode · Protocol · Items · Optional capabilities · Fit · Several jobs · Update and improve · Scope · Name · Model and effort · Color · Brief

## Plan mode

Runs once at the end of step 4 (Mode), after the snapshot freshness read (`WebFetch` only reads; a refresh stays in memory and is never written) and the Baseline, so `nothing-to-do` and any earlier stop never enter it (`Plan mode: skipped (<reason>)`).

- Plan mode already active → `already active`, stay in it. Otherwise load `EnterPlanMode` with ToolSearch if it is deferred, then call it. The user declines it, or the tool is unavailable → `declined`, and keep the AskUserQuestion Brief (Confirm | Revise | Stop).
- Steps 5–6 run inside plan mode: they only read and ask with AskUserQuestion. The interview runs as in `## Protocol`.
- At step 6 write the plan file: the Brief per `## Brief` (target, mode, items 1–13, diff, `Unverified:`) and the effects (the backup path, the file written or edited, and any changed doc fact from the freshness read). Call `ExitPlanMode`.
- Approval replaces Confirm → step 7. Rejection with feedback = Revise: reopen only the changed items, and it counts toward the 8 batches; cap hit → `Result: stopped`, `Stopped: 6: batch cap`. A rejection that asks to stop → `Result: cancelled`, write nothing. A rejection with no feedback → ask Revise | Stop (Stop → `Result: cancelled`); after Revise, reopen the items the user names and call `ExitPlanMode` again.
- The backup and the write come only after approval.

## Protocol

- At most 3 questions per batch, 2–4 options plus Other, the recommended option first, worded as a proposal with a one-line reason that cites a `file:line`, a sibling agent, or a doc line; no evidence → say "no evidence", give no recommendation. A Stop option on every batch.
- At most 8 batches per agent (11 asked items plus up to 4 capability questions is 15 at 3 per batch = 5, plus up to 3 revisions); every batch asked at steps 5–6 counts, including Brief Revise and plan rejections. Cap hit before a Brief is confirmed → `Result: stopped`, `Stopped: <step>: batch cap`, nothing written. Skip an item the input or a named file already answers; record its source (`user` or the path).
- Resolved means a user choice or a named file; never an assumption or a default.
- A vague answer ("whatever", "not sure") or "I don't know" → one follow-up with concrete options, or offer a read-only look-up (Grep, Read) and ask again with its result; still unresolved → stop with `Result: stopped`, never fill the gap.
- Any change at the brief reopens only the items it touches (counts toward the 8 batches).

## Items

| #   | Item                   | Ask                                                                                                                                                                                                                                                                                                                                   |
| --- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Job                    | One verb on one object; "and" or "also" → `## Several jobs`                                                                                                                                                                                                                                                                           |
| 2   | Fit                    | `## Fit`                                                                                                                                                                                                                                                                                                                              |
| 3   | Scope                  | `## Scope`                                                                                                                                                                                                                                                                                                                            |
| 4   | Name                   | `## Name`                                                                                                                                                                                                                                                                                                                             |
| 5   | Triggers               | The situations that must make the parent delegate; whether Claude should delegate on its own (yes and the agent works from a plain request: the parent can fill every input of at least one kind from its own context → `Use proactively` in `description`; else, or when it needs skill-supplied structured inputs, a plain trigger) |
| 6   | Inputs                 | Each input the parent passes in the delegation prompt                                                                                                                                                                                                                                                                                 |
| 7   | Tools, with the reason | An explicit minimal list; each tool tied to a Task step                                                                                                                                                                                                                                                                               |
| 8   | Writes                 | Files it edits or creates, or read-only; a writer gets the review gate (`agent-checklist`)                                                                                                                                                                                                                                            |
| 9   | Model and effort       | `## Model and effort` (one batch)                                                                                                                                                                                                                                                                                                     |
| 10  | Return                 | The fixed fields the parent uses, and which caller reads each                                                                                                                                                                                                                                                                         |
| 11  | Boundaries             | Out of scope, and the stop condition or cap for any loop                                                                                                                                                                                                                                                                              |
| 12  | Optional capabilities  | `## Optional capabilities`                                                                                                                                                                                                                                                                                                            |
| 13  | Overlap                | The sibling descriptions in the scope it could overlap                                                                                                                                                                                                                                                                                |

- Item 13 overlap: compare the new description with each sibling's in the scope; a close match is reported "Unverified" (`docs-snapshot.md` `## Unverified`), never claimed resolved.

## Optional capabilities

Multi-select questions of at most 3 capabilities each, batched per `## Protocol` (Stop on every batch); each option set only when chosen: `color` (display only), `maxTurns`, `isolation: worktree`, `memory` (makes the agent write-capable), `skills`, `background`, `omitClaudeMd`, `permissionMode` / `mcpServers` / `hooks` / `initialPrompt` (Personal or Project only). Propose none by default; each pick needs a signal from `agent-checklist.md` `## Fields on signal`. Nothing chosen → the field is omitted and the Brief says so with the default it falls back to.

## Fit

Recommend one option per question with a one-line reason.

| Signal                                                                                              | Recommend         | Why                                             |
| --------------------------------------------------------------------------------------------------- | ----------------- | ----------------------------------------------- |
| Self-contained work, verbose output the parent does not need, returns a summary                     | Subagent          | Own context; only the final message returns     |
| Needs its own tool limits, or independent work that can run in parallel                             | Subagent          | `tools` and parallel spawns                     |
| Back-and-forth with the user, much context shared across phases, a quick targeted edit, low latency | None: main thread | A subagent starts fresh and must gather context |
| Reference knowledge or a workflow that runs inline                                                  | None: a skill     | A skill adds to the main context on demand      |
| A rule that must hold every time with no judgment                                                   | None: a hook      | Hooks are guarantees; prompts are requests      |

Agents cost about 4× a chat's tokens and multi-agent about 15× (Anthropic, "How we built our multi-agent research system", <https://www.anthropic.com/engineering/multi-agent-research-system>); spawn only when the gain is worth it. Not a subagent → ask Stop (Recommended) | Build anyway.

## Several jobs

Multi-responsibility. A job is one verb on one object; "and" or "also" in the purpose, or two unrelated return shapes, signals several; one domain with a `kind` switch whose kinds each have a fixed Return is one job. A multi-job agent is never built. Ask with evidence (each job with its `file:line` or input quote) and the trade-off per option:

| Option   | Does                                                                 | Trade-off                                           |
| -------- | -------------------------------------------------------------------- | --------------------------------------------------- |
| A Split  | One agent per job, each with a full interview of its own             | More files and descriptions; each stays minimal     |
| B Narrow | One agent for the chosen job; the rest dropped and listed in `Open:` | The dropped jobs need another route later           |
| C Skill  | Move the workflow into a skill; no agent is built now                | Skill adds to the main context; agent stays focused |
| Stop     | Write nothing                                                        | The user narrows the request first                  |

| Signal                                                      | Recommend | Why                                                          |
| ----------------------------------------------------------- | --------- | ------------------------------------------------------------ |
| Jobs are independent and each has its own return shape      | A Split   | Separate agents run in parallel and keep tools minimal       |
| The jobs need different tools, models, or read-only vs edit | A Split   | A mixed allowlist breaks least privilege                     |
| One job is the goal and the rest are steps that serve it    | B Narrow  | Steps belong in `## Task`, not in a second agent             |
| The jobs form an ordered workflow with user decisions       | C Skill   | Orchestration with user interaction is a skill's job         |
| The input cannot say which job matters most                 | Stop      | Guessing builds the wrong agent; ask the user to narrow down |

- Split: each split agent gets its own interview; it inherits no tools, model, or trigger from the others. Show a before/after map (job → agent) and run the item 13 overlap check across the new descriptions (Unverified). Build the first now; `Next: build <names>` lists the rest.
- Skill: move the work to a Skill: tell the user; build nothing, `Result: stopped`, `Stopped: <step>: moved to a skill` (the step that ran the question).
- All options rejected or Stop → write nothing, `Result: cancelled`.

## Update and improve

- Show the diff first (each line to change: file:line, old → new, why); ask only items the request or a baseline violation touches; the rest keep their value and source = the agent path.
- A frontmatter field this skill does not know: flag it in the Brief and keep it; never silently delete anything the user wrote.

## Scope

| Signal                                                                              | Recommend                                     | Path                                                         |
| ----------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------ |
| Repo-specific; teammates should get it through git                                  | Project                                       | `<repo>/.claude/agents/<name>.md`                            |
| Your own cross-project habit                                                        | Personal                                      | `~/.claude/agents/<name>.md`                                 |
| `.claude-plugin/plugin.json` at the target root, or an agent meant for distribution | Plugin                                        | `<plugin root>/agents/<name>.md`, invoked `@<plugin>:<name>` |
| No signal                                                                           | Project when cwd is a git repo, else Personal |                                                              |

Precedence and plugin restrictions: `docs-snapshot.md` `## Scopes and precedence`, `## Plugin restrictions`. An agent needing an ignored field → Personal or Project.

## Name

- An actor noun for who does the job (`code-reviewer`, `log-analyzer`), never the action (`review-code`) or a gerund (`reviewing`). Actions name skills; actors name agents.
- A requested action name → ask Rename | Keep, recommending Rename with the actor form (`review-code` → `code-reviewer`).
- Lowercase, hyphen-separated; no `:`, no leading `-`; the file stem matches `name`.

## Model and effort

Asked in every create and update (improve: only when a violation touches them); a question the input already answers is skipped. Ground each recommendation:

1. Take the job, tools, and return shape from the items. Glob the target scope's agents directory, Grep `^model:`, `^effort:`, `^color:` in the siblings, and sort each sibling into a role by its `description`.
2. Siblings of the same role agree → recommend that value and cite it ("matches 6 sibling analyzers"). None, or they disagree → use the tables.
3. The job fits two rows → recommend the row for its hardest step (model) or the domain color (color), and say it was a close call.
4. Every reason cites a job, tool, or sibling fact and names the deciding criterion; never recommend from the name alone. Update: recommend the current value when the evidence supports it.

Criteria: reasoning depth, cost of a miss, context size, spawn frequency and latency, tool power, sibling consensus.

| Model    | Pick for                                                                                                                                                                   | Trade-off                                                                                                                   |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `haiku`  | Fixed-rule lookups, inventories, fact collection, data normalization                                                                                                       | Fastest and cheapest; enough when no judgment is needed                                                                     |
| `sonnet` | Judgment over a moderate scope: rubric scoring, analysis, drafting, docs, maintainability or test review                                                                   | Balanced cost and quality                                                                                                   |
| `opus`   | Hard multi-step reasoning where a miss is costly: correctness or security review, merge conflicts, interdependent planning, independent verification                       | More capable than `sonnet`, slower and costlier; use only when an error costs more than the run                             |
| `fable`  | Demanding reasoning and long-horizon agentic work, or a job where `opus` falls short (models overview: <https://platform.claude.com/docs/en/about-claude/models/overview>) | Slowest and costlier than `opus` (prices: see the models overview); recommend only when the input says `opus` is not enough |

Never omit `model`. `inherit` is written only when the user confirms it (the agent then follows the parent's model); otherwise recommend the alias the criteria support and say why.

| Effort   | Pick for                                                                                            | Trade-off                                                    |
| -------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `low`    | Fixed-rule lookups and inventories, or spawns that are frequent or fanned out where latency matters | Fastest and cheapest; shallow reasoning                      |
| `medium` | Bounded judgment over a moderate scope: scoring, drafting, analysis                                 | Balanced speed and depth                                     |
| `high`   | Multi-step reasoning across files where a miss is costly: correctness or security review            | Slower and costlier; catches more                            |
| `xhigh`  | Interdependent planning, conflict resolution, long-horizon edits                                    | Slower still; use when `high` misses cross-step dependencies |
| `max`    | Only when the input says `xhigh` is not enough                                                      | Slowest and most expensive level                             |

Layout: model options the recommended alias first and one alternate it was weighed against, the other aliases and `inherit` under Other; effort: the recommended level first, then its two neighbours; "Other" covers a full model ID only for model.

## Color

Asked only when chosen under `## Optional capabilities`. `color` only changes how the agent is displayed in the task list and transcript. The roles below are this plugin's own sibling convention (read from `agents/*.md` `color:` lines), not a documented rule: cite the sibling agents, and say "no evidence" when the scope has none.

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

A domain color wins over the generic one (security red and test blue beat reviewer purple). Layout: the recommended color with its reason, one alternate backed by evidence, and Stop; not chosen → omit the field.

## Brief

Step 6, before any write: show at most 40 lines (a longer diff goes to the plan file), then AskUserQuestion Confirm | Revise | Stop (plan mode entered → the `## Plan mode` plan file and `ExitPlanMode` instead).

- `Target: <absolute path>` and `Mode:`.
- Doc facts that differ from `docs-snapshot.md` after a due freshness read (in memory only), when any.
- Items 1–13, one line each: value and source (`user` or the path). An omitted field is listed with the default it falls back to; `tools` and `disallowedTools` both omitted is stated as "every tool".
- Update and improve: the diff; collisions and multi-scope picks show the diff against each candidate; unknown fields flagged.
- `Unverified:` (facts omitted, overlaps), `Dropped jobs:` when narrowed or split.
- Revise → reopen only the changed items; Stop or no answer → write nothing, `Result: cancelled`. A timed-out answer is never Confirm.
