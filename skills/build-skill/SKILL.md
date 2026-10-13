---
name: build-skill
description: Create or update a Claude Code skill (Reference, Task, or Background-only) in a Personal, Project, or Plugin scope. Asks scope and kind with a reasoned recommendation, hands the draft to skill-creator under the bundled frontmatter and body rules, then scores it against a 100-point rubric (pass 95). Use only when the user explicitly asks to make, build, scaffold, fix, improve, or update a skill or slash command. Do not use on your own after finishing a task.
argument-hint: '[skill name or path] [what it should do]'
allowed-tools: Read Glob Grep Skill Agent AskUserQuestion Write Edit Bash(claude plugin validate *)
---

# Build skill

Input: $ARGUMENTS

Companion to `skill-creator`: this skill decides and enforces the rules; `skill-creator` writes and tests the skill.

## Rules

- Self-contained: follow only the files linked below; `skill-creator` is the one external skill.
- Ask with AskUserQuestion: at most 4 questions per batch, recommendation first with a one-line reason, and a Stop option on every batch (Stop → `Result: cancelled`). Skip a question the input already answers.
- Loops: clarify at most 3 rounds; score-and-fix at most 3 rounds. Never loop past the cap; report what is left in `Gaps:`.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- `validate-plugin` runs once from the plugin root; a failure goes to `Gaps:` with no retry.
- Never write outside the chosen scope's skill directory; update edits in place and keeps existing sections.
- Never invent a frontmatter field; use only those in `${CLAUDE_SKILL_DIR}/references/frontmatter.md`.

## Workflow

1. **Extract.** Existing skill named (path or `name`) → update: read it; else create. Pull goal, triggers, arguments, side effects, outputs. Nothing to change → `Result: nothing-to-do`.
2. **Scope.** AskUserQuestion: Personal | Project | Plugin, recommended from `${CLAUDE_SKILL_DIR}/references/decide.md` `## Scope`.
3. **Kind.** AskUserQuestion: Reference | Task | Background-only, recommended from `decide.md` `## Kind`; then only the flags `decide.md` `## Invocation` cannot derive.
4. **Clarify.** Fill every missing item (name, triggers, arguments, side effects, outputs) per Rules. Stop → `Result: cancelled`.
5. **Hand off.** Invoke `skill-creator` through the Skill tool with the brief in `${CLAUDE_SKILL_DIR}/references/handoff.md`; it points to `${CLAUDE_SKILL_DIR}/references/frontmatter.md`, `${CLAUDE_SKILL_DIR}/references/body.md`, and `${CLAUDE_SKILL_DIR}/assets/templates.md`. Missing → stop, `Result: stopped`.
6. **Score.** Spawn `skill-scorer` with the skill dir, `${CLAUDE_SKILL_DIR}/references/rubric.md`, scope, kind, mode, and flags; below 95 → fix, rescore per Rules. Plugin scope → `validate-plugin`.
7. **Output.** Print the block below, nothing else.

## Output

```text
Scope: Personal | Project | Plugin
Kind: Reference | Task | Background-only
Mode: create | update
Files: <paths>
Invoke: /<name> | Claude only | user only
Score: <n>/100 (pass | below 95)
Checks: validate-plugin pass | fail | n/a
Gaps: <rubric deductions left | none>
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
