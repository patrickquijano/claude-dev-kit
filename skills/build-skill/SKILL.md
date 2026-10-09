---
name: build-skill
description: Create or update Claude Code skills and orchestrator skills with their subagents (SKILL.md, agents/*.md). Use only when the user explicitly asks to make, build, scaffold, fix, improve, or update a skill, slash command, or orchestrator/workflow skill. A standalone subagent goes to /cdk:build-agent. Do not use on your own after finishing a task.
argument-hint: '[description of skill/orchestrator, or path to existing one]'
---

# Build Skill

Input: $ARGUMENTS

## Rules

- No hallucination. Verify frontmatter fields/behavior vs official docs (<https://code.claude.com/docs/en/skills>, <https://code.claude.com/docs/en/sub-agents>). Unverified → omit and report.
- No assumption. Gap/ambiguity → AskUserQuestion: 2–4 options, recommended first w/ "(Recommended)", justification in description. Derivable answer → don't ask.
- Token-efficient: omit default-valued frontmatter; body in concise prose, each rule with its reason beside it, no filler; details → sibling files.
- Loops: clarify (step 3) max 3 rounds; verify-fix (step 8) max 3 attempts; still incomplete or failing → print the Output with `Stopped: <step>: <reason>` and end.
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/fallbacks.md`.
- Never run `claude plugin eval` (LLM-graded); structural validation only.
- Known issues: follow `${CLAUDE_SKILL_DIR}/known-issues.md` with slug `build-skill`, or the target skill when the issue belongs to it.
- Platform facts:
  - Subagents never get AskUserQuestion → all user interaction in main-thread skill.
  - Orchestrator skill and every skill it chains must NOT set `context: fork` (runs as subagent → loses AskUserQuestion, nests spawns). Chain via the Skill tool in the main thread, never the Agent tool.
  - Subagent fields, tools, and limits: `${CLAUDE_SKILL_DIR}/../build-agent/practices.md`.
  - `disable-model-invocation: true` blocks Skill-tool invocation, so an orchestrator chaining that skill breaks.

## Workflow

1. **Extract.** Mode: input names an existing skill path or name → update, read its files (and the agents it spawns); else create. Update with nothing to change → print the Output, `Result: nothing-to-do`. From input (+ those files) pull: goal, trigger phrases, args, steps, tools, side effects, outputs.
2. **Decide.** Infer first; AskUserQuestion only for what stays ambiguous, recommend w/ justification:
   - Type: **skill** (linear task, user interaction, small context) | **orchestrator + subagents** (parallelizable steps, large reads/outputs to isolate, distinct tool scopes) | **subagent only** → print the Output with `Result: stopped`, `Stopped: 2: standalone subagent; run /cdk:build-agent <input>` and end.
   - Location (root): personal `~/.claude/` | project `.claude/` | plugin root.
   - Model invocation: never ask about it or offer to disable it; omit `disable-model-invocation`, so Claude and orchestrators can invoke the skill. Side-effect skill (writes files, commits, pushes, posts, deploys) → use the side-effect description pattern in `${CLAUDE_SKILL_DIR}/templates.md`, so it never runs unasked. Set `disable-model-invocation: true` only when the user explicitly asks to disable model invocation; skill chained by an orchestrator via the Skill tool → say it breaks that chain and confirm first.
3. **Clarify loop.** Fill every item from step 1; per subagent also: task, tools, model, return shape, parallel-safe? Missing/ambiguous → AskUserQuestion (≤4 per batch); each batch's first question also offers Stop. Repeat until complete, max 3 rounds. Stop → end, `Result: cancelled`.
4. **Draft.** Create → `${CLAUDE_SKILL_DIR}/templates.md`; subagent files also follow `${CLAUDE_SKILL_DIR}/../build-agent/practices.md`. Update → edit in place; keep existing sections; change only items settled in steps 1–3.
5. **Plan.** Print the plan (files + one-line purpose each, incl. step 7 files), then write without asking.
6. **Write** files.
7. **Maintain.** Location is a plugin root (`.claude-plugin/plugin.json` exists) → in the same change update its `README.md` skills/agents tables, `CLAUDE.md`, and `.claude/rules/` for the added or changed component, per its CLAUDE.md Maintenance rule.
8. **Verify.**
   - Self-check: valid YAML; skill `name` kebab-case = dir name; `description` + `when_to_use` ≤1,536 chars; SKILL.md <500 lines; agent `name` unique, kebab-case, no `:`; `tools` names valid.
   - Plugin root → `claude plugin validate --strict .`.
   - Spawn in one message, in parallel: `plugin-dev:skill-reviewer` per skill written (its SKILL.md path); `plugin-dev:plugin-validator` when an agent was written to a plugin location (plugin root, agent paths); `cdk:skill-auditor` with location root (`~/.claude`, `<repo>/.claude`, or plugin root), repo root (for `.claude/rules/`; none for `~/.claude`), and every written path; read its `Rules:` and `Contracts:` (`Rules: none` or no rule matched → warning).
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
Checks: validate --strict <pass | fail | n/a>, skill-reviewer <pass | n findings | skipped — reason>, plugin-validator <pass | n findings | skipped — reason>, skill-auditor <pass | n findings>, rules <files | none>, contracts <ok | n findings | none>
Known issues: <saved memory file | printed line>, … | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
