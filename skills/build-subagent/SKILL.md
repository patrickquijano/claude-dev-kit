---
name: build-subagent
description: Creates or updates a custom subagent in any scope, then checks and scores it against a 100-point rubric. Use only when the user explicitly asks to build, fix, or update a subagent.
argument-hint: '[agent name or path] [what it should do]'
allowed-tools: Read Glob Grep Agent AskUserQuestion Write Edit Bash(claude plugin validate *) Bash(node ${CLAUDE_SKILL_DIR}/scripts/check-agent.mjs *)
---

# Build subagent

Input: $ARGUMENTS

## Rules

- Rigor: never guess or invent: confirm each path, command, and fact by reading it; ask (unattended: record) what the input and repo cannot answer. Finish every step in full, think twice before each irreversible step, and re-check the result against these rules and the repo's standards before reporting.
- Efficiency: read only what a step needs, keep output terse, and take the fewest steps that meet the goal; when work is autonomous and splits cleanly, spawn independent cdk subagents in one parallel turn (`cdk:task-worker` for read-only work, `cdk:plan-implementer` for edits), never `Explore` or `general-purpose`; each spawn gets a complete brief (agent, kind, literal inputs, scope, return block; missing or ambiguous → `Question:`, never assume).
- Self-contained: follow only the files linked below; never link, read, or copy from another skill's files.
- Ask with AskUserQuestion: at most 4 questions per batch, recommendation first with a one-line reason, and a Stop option on every batch (Stop → `Result: cancelled`). Skip a question the input already answers.
- Never invent: use only the fields and behaviors in `${CLAUDE_SKILL_DIR}/references/frontmatter.md` and `${CLAUDE_SKILL_DIR}/references/body.md`; anything unverified is omitted and listed in `Open:`.
- Loops: clarify (including Gate Revise) at most 3 rounds; improve rounds at most 3; step 1 one `cdk:codebase-explorer` spawn; `check-agent` exit 2 → fix the call and re-run once, then `Open:`; a malformed or `Question:` spawn return → respawn once. Never loop past the cap; report what is left in `Open:`.
- No file is written before the Gate confirmation.
- Only `cdk:rubric-improver` applies score fixes.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags. `validate-plugin` runs once per run; a failure goes to `Open:` with no retry.
- Write only the agent file; update edits in place. The spawning skill is read, never edited: mismatches go to `Open:`.
- Name an agent as an actor, never an action: `code-reviewer`, not `review-code` or `reviewing`; a name that is a verb or gerund is asked (Rename | Keep).
- One agent, one job: several jobs found are asked (Split | Pick one | Stop), each with a recommendation and a one-line reason; never build a multi-job agent.
- `check-agent` is the source of truth for mechanical rules: never hand-check what it covers, never edit an agent only to silence it.

## Workflow

1. **Extract.** Find the named agent (update) or create, extract its fields, and spawn the explorer per `score.md` `## Spawn briefs`; see `decide.md` `## Extract`. Nothing to change → `Result: nothing-to-do`.
2. **Fit.** Apply `${CLAUDE_SKILL_DIR}/references/decide.md` `## Fit` and `## One job`. Not a subagent → ask Stop (Recommended) | Build anyway; several jobs → ask Split | Pick one | Stop, recommended per `decide.md` `## One job`.
3. **Scope.** AskUserQuestion: Personal | Project | Plugin, recommended from `decide.md` `## Scope`.
4. **Clarify.** Fill name (an actor noun per `decide.md` `## One job`), description triggers, tools, return, writes, and the optional fields `decide.md` `## Fields` signals. Always ask model, effort, and color in one batch per `decide.md` `## Model and effort` and `## Color`. Stop → `Result: cancelled`.
5. **Gate.** Show a summary of 7 lines or fewer with `Target: <absolute path>`, then AskUserQuestion: "Write `<path>`" (create) or "Overwrite `<path>`" (update), Revise, Stop. Revise re-asks only the changed topics and counts toward the clarify cap. Stop → `Result: cancelled`.
6. **Draft.** Write the file per `${CLAUDE_SKILL_DIR}/references/frontmatter.md`, `${CLAUDE_SKILL_DIR}/references/body.md`, and `${CLAUDE_SKILL_DIR}/assets/template.md`.
7. **Check and score.** Run `check-agent`, spawn `cdk:rubric-scorer` with `kind: agent` and its JSON, per `${CLAUDE_SKILL_DIR}/references/score.md`.
8. **Report.** Show the score table, deductions, and `Contract:` per `score.md` `## Report`. Check passes with no deductions, or 3 rounds done → step 10.
9. **Improve.** Spawn `cdk:rubric-improver` (`kind: agent`) per `score.md` `## Improve round`, then repeat steps 7 and 8.
10. **Validate.** Plugin scope: run `validate-plugin` once from the plugin root, after the loop ends; other scopes skip. Failure → `Open:`, no retry (`score.md` `## Validate`).
11. **Output.** Print the block below, nothing else.

## Files

- For extraction, fit, scope, and the optional-field decisions, see `${CLAUDE_SKILL_DIR}/references/decide.md`.
- For frontmatter fields, tools, and description writing, see `${CLAUDE_SKILL_DIR}/references/frontmatter.md`.
- For body structure, style, and return format, see `${CLAUDE_SKILL_DIR}/references/body.md`.
- For the agent skeleton, see `${CLAUDE_SKILL_DIR}/assets/template.md`.
- For running the check, the report, the improve round, `Open:`, `validate-plugin`, and spawn briefs (steps 1, 7, 8, 9, 10), see `${CLAUDE_SKILL_DIR}/references/score.md`.
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
Reload: none | restart (new agents dir)
Open: <left | none>
Next: /cdk:commit-changes | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
