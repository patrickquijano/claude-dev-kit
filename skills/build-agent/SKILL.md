---
name: build-agent
description: Creates or updates a custom subagent in any scope, then checks and scores it against a 100-point rubric. Use only when the user explicitly asks to build, fix, or update a subagent.
argument-hint: '[agent name or path] [what it should do]'
allowed-tools: Read Glob Grep Agent AskUserQuestion Write Edit Bash(claude plugin validate *) Bash(node ${CLAUDE_SKILL_DIR}/scripts/check-agent.mjs *)
---

# Build agent

Input: $ARGUMENTS

## Rules

- Self-contained: follow only the files linked below; never link, read, or copy from another skill's files.
- Ask with AskUserQuestion: at most 4 questions per batch, recommendation first with a one-line reason, and a Stop option on every batch (Stop → `Result: cancelled`). Skip a question the input already answers.
- Never assume: an item the input and the repo cannot answer is asked.
- Never invent: use only the fields and behaviors in `${CLAUDE_SKILL_DIR}/references/frontmatter.md` and `${CLAUDE_SKILL_DIR}/references/body.md`; anything unverified is omitted and listed in `Gaps:`.
- Loops: clarify at most 3 rounds; improve rounds at most 3. Never loop past the cap; report what is left in `Gaps:`.
- Only `cdk:agent-improver` applies score fixes.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags. `validate-plugin` runs once; a failure goes to `Gaps:` with no retry.
- Write only the agent file; update edits in place. The spawning skill is read, never edited: mismatches go to `Gaps:`.
- Name an agent as an actor, never an action: `code-reviewer`, not `review-code` or `reviewing`; a name that is a verb or gerund is asked (Rename | Keep).
- One agent, one job: several jobs found are asked (Split | Pick one | Stop), each with a recommendation and a one-line reason; never build a multi-job agent.
- `check-agent` is the source of truth for mechanical rules: never hand-check what it covers, never edit an agent only to silence it.

## Workflow

1. **Extract.** An existing agent named (path or `name`) → update: find it under `~/.claude/agents/`, `<repo>/.claude/agents/`, or a plugin `agents/` (recursive), then read it; else create. Pull job, triggers, inputs, tools, writes, return shape, and spawning skill. Nothing to change → `Result: nothing-to-do`.
2. **Fit.** Apply `${CLAUDE_SKILL_DIR}/references/decide.md` `## Fit` and `## One job`. Not a subagent → ask Stop (Recommended) | Build anyway; several jobs → ask Split | Pick one | Stop, recommended per `decide.md` `## One job`.
3. **Scope.** AskUserQuestion: Personal | Project | Plugin, recommended from `decide.md` `## Scope`.
4. **Clarify.** Fill name (an actor noun per `decide.md` `## One job`), description triggers, tools, return, writes, and the optional fields `decide.md` `## Fields` signals. Always ask model and color, in create and update, in one batch per `decide.md` `## Model` and `## Color`, recommended from the job, tools, and sibling agents; a question the input already answers is skipped. Stop → `Result: cancelled`.
5. **Draft.** Write the file per `${CLAUDE_SKILL_DIR}/references/frontmatter.md`, `${CLAUDE_SKILL_DIR}/references/body.md`, and `${CLAUDE_SKILL_DIR}/assets/template.md`.
6. **Check and score.** Run `check-agent`, spawn `cdk:agent-scorer` with its JSON, per `${CLAUDE_SKILL_DIR}/references/score.md`.
7. **Report.** Show the score table, deductions, and `Contract:` per `score.md` `## Report`. Check passes with no deductions, or 3 rounds done → step 9.
8. **Improve.** Spawn `cdk:agent-improver` per `score.md` `## Improve round`, then repeat steps 6 and 7; plugin scope also runs `validate-plugin` once.
9. **Output.** Print the block below, nothing else.

## Files

- For fit, scope, and the optional-field decisions, see `${CLAUDE_SKILL_DIR}/references/decide.md`.
- For frontmatter fields, tools, and description writing, see `${CLAUDE_SKILL_DIR}/references/frontmatter.md`.
- For body structure, style, and return format, see `${CLAUDE_SKILL_DIR}/references/body.md`.
- For the agent skeleton, see `${CLAUDE_SKILL_DIR}/assets/template.md`.
- For running the check, the report, the improve round, and `Gaps:`, see `${CLAUDE_SKILL_DIR}/references/score.md`.
- For the scoring criteria, see `${CLAUDE_SKILL_DIR}/references/rubric.md`.
- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For the mechanical checks, run `${CLAUDE_SKILL_DIR}/scripts/check-agent.mjs`; it is run, never read.

## Output

```text
Scope: Personal | Project | Plugin
Mode: create | update
File: <path>
Invoke: @<[plugin:]name> | spawned by <skill>
Score: <n>/100 (pass | below 95)
Rounds: <n>/3
Checks: check-agent pass | fail; validate-plugin pass | fail | n/a
Contract: ok | <n> mismatches | n/a
Reload: none | restart (new agents dir) | /reload-plugins
Gaps: <left | none>
Next: /cdk:commit-changes | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
