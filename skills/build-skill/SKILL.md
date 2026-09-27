---
name: build-skill
description: Create or update Claude Code skills, orchestrator skills, and custom subagents (SKILL.md, agents/*.md). Use when the user asks to make, build, scaffold, fix, improve, or update a skill, slash command, orchestrator/workflow skill, or custom subagent/agent.
argument-hint: '[description of skill/orchestrator/subagent, or path to existing one]'
---

# Build Skill

Input: $ARGUMENTS

## Rules

- No hallucination. Verify frontmatter fields/behavior vs official docs (<https://code.claude.com/docs/en/skills>, <https://code.claude.com/docs/en/sub-agents>). Unverified → ask or omit.
- No assumption. Gap/ambiguity → AskUserQuestion: 2–4 options, recommended first w/ "(Recommended)", justification in description. Derivable answer → don't ask.
- Token-efficient: omit default-valued frontmatter; body caveman-style (terse fragments, no filler); details → sibling files.
- Known issues: before fixing, check this skill's and target's `## Known issues`; reuse match. Fix for a recurring or workflow-blocking issue → append `- <symptom> → <fix>` to source file (repo path, never plugin cache).
- Platform facts:
  - Subagents never get AskUserQuestion → all user interaction in main-thread skill.
  - Orchestrator skill must NOT set `context: fork` (runs as subagent → loses AskUserQuestion).
  - Subagent spawns subagents only if `tools` includes `Agent`; max 3 layers.
  - Plugin agents ignore `hooks`, `mcpServers`, `permissionMode`.

## Workflow

1. **Extract.** From input (+ existing files if updating) pull: goal, trigger phrases, args, steps, tools, side effects, outputs.
2. **Decide.** Infer first; AskUserQuestion only for what stays ambiguous, recommend w/ justification:
   - Mode: target exists → update, else create.
   - Type: **skill** (linear task, user interaction, small context) | **orchestrator + subagents** (parallelizable steps, large reads/outputs to isolate, distinct tool scopes) | **subagent only**.
   - Location (root): personal `~/.claude/` | project `.claude/` | plugin root.
3. **Clarify loop.** Fill every item from step 1; per subagent also: task, tools, model, return shape, parallel-safe? Missing/ambiguous → AskUserQuestion (≤4 per batch). Repeat until complete.
4. **Draft.** Create → [templates.md](templates.md). Update → edit in place; keep existing sections + all Known issues entries; change only confirmed items.
5. **Compress.** Body prose → `mcp__caveman__caveman_compress` if available, else hand-write caveman-style. Never compress frontmatter, code, paths, commands.
6. **Approve.** Show plan (files + one-line purpose each) → AskUserQuestion: Write (Recommended) | Revise. Revise → back to step 3.
7. **Write** files.
8. **Verify.**
   - Skill: valid YAML; `name` kebab-case = dir name; `description` + `when_to_use` ≤1,536 chars; SKILL.md <500 lines.
   - Agent: `name` unique, kebab-case, no `:`; `tools` names valid.
   - Plugin root → `claude plugin validate --strict .`.
   - Fail → fix, record in Known issues, re-verify.

## Output format

```text
Type: skill | orchestrator + subagents | subagent
Mode: create | update
Location: <root>
Files:
- <path> — <purpose>
Invoke: /[<plugin>:]<name> <args>
Known issues: <count or none>
```

## Known issues

- none
