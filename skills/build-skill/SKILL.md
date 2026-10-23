---
name: build-skill
description: Creates or updates a skill or slash command in any scope, then checks and scores it against a 100-point rubric. Use only when the user explicitly asks to build, fix, or update a skill.
argument-hint: '[skill name or path] [what it should do]'
allowed-tools: Read Glob Grep Skill Agent AskUserQuestion Write Edit Bash(claude plugin validate *) Bash(node ${CLAUDE_SKILL_DIR}/scripts/check-skill.mjs *)
---

# Build skill

Input: $ARGUMENTS

This skill decides, writes, and enforces the rules; `skill-creator` is optional, for evals only.

## Rules

- Rigor: never guess or invent: confirm each path, command, and fact by reading it; ask (unattended: record) what the input and repo cannot answer. Finish every step in full, think twice before each irreversible step, and re-check the result against these rules and the repo's standards before reporting.
- Efficiency: read only what a step needs, keep output terse, and take the fewest steps that meet the goal; when work is autonomous and splits cleanly, spawn independent cdk subagents in one parallel turn (`cdk:task-worker` for read-only work, `cdk:plan-implementer` for edits), never `Explore` or `general-purpose`.
- Self-contained: follow only the files linked below; never link, read, or copy from another skill's files. `skill-creator` is optional, for evals only.
- Ask with AskUserQuestion: at most 4 questions per batch, recommendation first with a one-line reason, and a Stop option on every batch (Stop → `Result: cancelled`). Skip a question the input already answers.
- Loops: clarify at most 3 rounds; improve rounds at most 3. Never loop past the cap; report what is left in `Open:`.
- Only `cdk:rubric-improver` applies score fixes.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- `validate-plugin` runs once from the plugin root; a failure goes to `Open:` with no retry.
- Never write outside the chosen scope's skill directory; update edits in place and keeps existing sections.
- Never invent a frontmatter field; use only those in `${CLAUDE_SKILL_DIR}/references/frontmatter.md`.
- Name a skill by its action, verb-first (`review-code`), never by the actor (`code-reviewer`).
- One skill, one job. Several jobs found at Extract → ask Split | Pick one | Stop; never build a multi-job skill.
- `check-skill` is the source of truth for mechanical rules: never hand-check what it covers, never edit a skill only to silence it.

## Workflow

1. **Extract.** Existing skill named (path or `name`) → update: read it; else create. Pull goal, triggers, arguments, side effects, outputs; more than one job → ask per `${CLAUDE_SKILL_DIR}/references/decide.md` `## One job`. Nothing to change → `Result: nothing-to-do`.
2. **Scope.** AskUserQuestion: Personal | Project | Plugin, recommended from `${CLAUDE_SKILL_DIR}/references/decide.md` `## Scope`.
3. **Kind.** AskUserQuestion: Reference | Task | Background-only, recommended from `decide.md` `## Kind`; then only the flags `decide.md` `## Invocation` cannot derive.
4. **Clarify.** Fill every missing item (name, triggers, arguments, side effects, outputs) per Rules. Stop → `Result: cancelled`.
5. **Draft.** Write the files per `${CLAUDE_SKILL_DIR}/references/frontmatter.md`, `${CLAUDE_SKILL_DIR}/references/body.md`, and `${CLAUDE_SKILL_DIR}/assets/templates.md`; update edits in place.
6. **Check and score.** Run `check-skill`, spawn `cdk:rubric-scorer` with `kind: skill` and its JSON, per `${CLAUDE_SKILL_DIR}/references/score.md`.
7. **Report.** Show the score table and deductions per `score.md` `## Report`. Check passes with no deductions, or 3 rounds done → step 9.
8. **Improve.** Spawn `cdk:rubric-improver` (`kind: skill`) per `score.md` `## Improve round`, then repeat steps 6 and 7.
9. **Evals.** Only when `skill-creator` is in the session's skill list: AskUserQuestion Skip (Recommended) | Run skill-creator evals | Stop; follow `${CLAUDE_SKILL_DIR}/references/evals.md`. Not listed → `Evals: n/a`; unattended → `Evals: skipped`, no question.
10. **Output.** Print the block below, nothing else.

## Files

- For scope, kind, invocation, the name rule, and the one-job rule, see `${CLAUDE_SKILL_DIR}/references/decide.md`.
- For the optional skill-creator evals step, see `${CLAUDE_SKILL_DIR}/references/evals.md`.
- For frontmatter fields and description writing, see `${CLAUDE_SKILL_DIR}/references/frontmatter.md`.
- For body structure, lazy loading, and navigation, see `${CLAUDE_SKILL_DIR}/references/body.md`.
- For skeletons per kind, see `${CLAUDE_SKILL_DIR}/assets/templates.md`.
- For running the check, the report, the improve round, and `Open:`, see `${CLAUDE_SKILL_DIR}/references/score.md`.
- For the scoring criteria, see `${CLAUDE_SKILL_DIR}/references/rubric.md`.
- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For the mechanical checks, run `${CLAUDE_SKILL_DIR}/scripts/check-skill.mjs`; it is run, never read.

## Output

```text
Scope: Personal | Project | Plugin
Kind: Reference | Task | Background-only
Mode: create | update
Files: <paths>
Invoke: /<name> | Claude only | user only
Score: <n>/100 (pass | below 95)
Rounds: <n>/3
Checks: check-skill pass | fail; validate-plugin pass | fail | n/a
Evals: run | skipped | n/a
Open: <rubric deductions left | none>
Next: /cdk:commit-changes | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
