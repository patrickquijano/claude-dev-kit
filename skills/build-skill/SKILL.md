---
name: build-skill
description: Create or update Claude Code skills and orchestrator skills with their subagents (SKILL.md, agents/*.md). Use when the user asks to make, build, scaffold, fix, improve, or update a skill, slash command, or orchestrator/workflow skill. A standalone subagent goes to /cdk:build-agent.
argument-hint: '[description of skill/orchestrator, or path to existing one]'
disable-model-invocation: true
---

# Build Skill

Input: $ARGUMENTS

## Rules

- No hallucination. Verify frontmatter fields/behavior vs official docs (<https://code.claude.com/docs/en/skills>, <https://code.claude.com/docs/en/sub-agents>). Unverified → ask or omit.
- No assumption. Gap/ambiguity → AskUserQuestion: 2–4 options, recommended first w/ "(Recommended)", justification in description. Derivable answer → don't ask, except `disable-model-invocation`, which is always asked (step 2).
- Token-efficient: omit default-valued frontmatter; body in concise prose, each rule with its reason beside it, no filler; details → sibling files.
- Loops: clarify (step 3) max 3 rounds; verify-fix (step 8) max 3 attempts; still incomplete or failing → print the Output with `Stopped: <step>: <reason>` and end. Revise (step 5) runs until the user picks Write or Stop.
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/fallbacks.md`.
- Never run `claude plugin eval` (LLM-graded); structural validation only.
- Known issues: follow `${CLAUDE_SKILL_DIR}/known-issues.md` with slug `build-skill`, or the target skill when the issue belongs to it.
- Platform facts:
  - Subagents never get AskUserQuestion → all user interaction in main-thread skill.
  - Orchestrator skill must NOT set `context: fork` (runs as subagent → loses AskUserQuestion).
  - Subagent fields, tools, and limits: `${CLAUDE_SKILL_DIR}/../build-agent/practices.md`.
  - `disable-model-invocation: true` blocks Skill-tool invocation, so an orchestrator chaining that skill breaks.

## Workflow

1. **Extract.** Mode: input names an existing skill path or name → update, read its files (and the agents it spawns); else create. Update with nothing to change → print the Output, `Result: nothing-to-do`. From input (+ those files) pull: goal, trigger phrases, args, steps, tools, side effects, outputs.
2. **Decide.** Infer first; AskUserQuestion only for what stays ambiguous, recommend w/ justification:
   - Type: **skill** (linear task, user interaction, small context) | **orchestrator + subagents** (parallelizable steps, large reads/outputs to isolate, distinct tool scopes) | **subagent only** → print the Output with `Result: stopped`, `Stopped: 2: standalone subagent; run /cdk:build-agent <input>` and end (its Disable setting blocks Skill-tool chaining).
   - Location (root): personal `~/.claude/` | project `.claude/` | plugin root.
   - Model invocation (skills and orchestrators, not subagents; always ask, on create and on update; on update show the current value): the user decides, since it changes who can start the skill. Options: Disable (`disable-model-invocation: true`; only `/<name>` starts it and its description leaves Claude's context) | Allow (field omitted; Claude may invoke it when a request matches the description). Recommend Disable when the skill has side effects (writes files, commits, pushes, posts, deploys) and no other skill chains it, so it never runs unasked; else recommend Allow, so Claude can use it when relevant. Skill invoked by an orchestrator via the Skill tool → recommend Allow and say Disable breaks that chain. Put the reason in the recommended option's description.
3. **Clarify loop.** Fill every item from step 1; per subagent also: task, tools, model, return shape, parallel-safe? Missing/ambiguous → AskUserQuestion (≤4 per batch); each batch's first question also offers Stop. Repeat until complete, max 3 rounds. Stop → end, `Result: cancelled`.
4. **Draft.** Create → `${CLAUDE_SKILL_DIR}/templates.md`; subagent files also follow `${CLAUDE_SKILL_DIR}/../build-agent/practices.md`. Update → edit in place; keep existing sections; change only confirmed items.
5. **Approve.** Show plan (files + one-line purpose each, incl. step 7 files) → AskUserQuestion: Write (Recommended) | Revise | Stop. Revise → back to step 3; Revise resets the step 3 round counter. Stop → end, `Result: cancelled`.
6. **Write** files.
7. **Maintain.** Location is a plugin root (`.claude-plugin/plugin.json` exists) → in the same change update its `README.md` skills/agents tables, `CLAUDE.md`, and `.claude/rules/` for the added or changed component, per its CLAUDE.md Maintenance rule.
8. **Verify.**
   - Self-check: valid YAML; skill `name` kebab-case = dir name; `description` + `when_to_use` ≤1,536 chars; SKILL.md <500 lines; agent `name` unique, kebab-case, no `:`; `tools` names valid.
   - Plugin root → `claude plugin validate --strict .`.
   - Spawn in one message, in parallel: `plugin-dev:skill-reviewer` per skill written (its SKILL.md path); `plugin-dev:plugin-validator` when an agent was written to a plugin location (plugin root, agent paths); `cdk:skill-auditor` with location root (`~/.claude`, `<repo>/.claude`, or plugin root), repo root (for `.claude/rules/`; none for `~/.claude`), and every written path.
   - plugin-dev agents unavailable → skip them, note in Output `Checks`.
   - Merge all findings, deduplicated by file:line; collect agents' `Known issue:` lines. Any error or warning → fix; recurring or blocking → save per Known issues rule; re-verify (max 3 attempts).

## Output

```text
Type: skill | orchestrator + subagents | subagent only
Mode: create | update
Location: <root>
Files:
- <path> — <purpose>
Invoke: /[<plugin>:]<name> <args>
Checks: validate --strict <pass | fail | n/a>, skill-reviewer <pass | n findings | skipped — reason>, plugin-validator <pass | n findings | skipped — reason>, skill-auditor <pass | n findings>
Known issues: <saved memory file | printed line>, … | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
