---
name: build-skill
description: Create or update Claude Code skills (task, reference, or background-only) and orchestrator skills with their subagents (SKILL.md, agents/*.md), in personal, project, or plugin scope, with optional skill-creator evals. Use only when the user explicitly asks to make, build, scaffold, fix, improve, or update a skill, slash command, or orchestrator/workflow skill. A standalone subagent goes to /cdk:build-agent. Do not use on your own after finishing a task.
argument-hint: '[description of skill/orchestrator, or path to existing one]'
---

# Build Skill

Input: $ARGUMENTS

## Rules

- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- No hallucination. Verify frontmatter fields/behavior vs official docs (<https://code.claude.com/docs/en/skills>, <https://code.claude.com/docs/en/sub-agents>). Unverified → omit and report.
- No assumption. Gap/ambiguity → AskUserQuestion: 2–4 options, recommended first w/ "(Recommended)", justification in description. Derivable answer → don't ask.
- Drafting follows `${CLAUDE_SKILL_DIR}/references/frontmatter.md` and `${CLAUDE_SKILL_DIR}/references/body.md` (fields, limits, lazy loading, token efficiency); omit default-valued frontmatter; runnable commands → `references/commands.md`, referenced by name.
- Decisions (scope, kind, shape, invocation) follow `${CLAUDE_SKILL_DIR}/references/decide.md`.
- Loops: clarify (step 3) max 3 rounds; verify-fix (step 7) max 3 attempts; evals handoff (step 8) once, with one re-verify not counted in the 3; clarify cap hit or a failure before step 7 → print the Output with `Resolution: not run (stopped)`, `Stopped: <step>: <reason>`, and end; a failure in step 7 or 8 after findings exist runs step 9 first; verify cap hit → run step 9 on what is left, then print the Output with `Stopped: 7: <reason>` and end.
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/references/fallbacks.md`.
- Never run `claude plugin eval` (LLM-graded). skill-creator evals only when the user opts in (step 8).
- Final step: follow `${CLAUDE_SKILL_DIR}/references/resolve-findings.md` (scope: edit; sources: reviewer, validator, and auditor findings left after the verify cap, itemized; `Checks:` fail or skipped).
- Known issues: follow `${CLAUDE_SKILL_DIR}/references/known-issues.md` with slug `build-skill` and store `${CLAUDE_PLUGIN_DATA}/known-issues`, or the target skill when the issue belongs to it.
- Platform facts:
  - Subagents never get AskUserQuestion → all user interaction in main-thread skill.
  - Orchestrator skill and every skill it chains must NOT set `context: fork` (runs as subagent → loses AskUserQuestion, nests spawns). Chain via the Skill tool in the main thread, never the Agent tool.
  - Subagent fields, tools, and limits: `${CLAUDE_SKILL_DIR}/../build-agent/references/practices.md`.

## Workflow

1. **Extract.** Input names an existing skill path or name → update, read its files (and the agents it spawns); else create. Update with nothing to change → print the Output, `Result: nothing-to-do`. Pull goal, trigger phrases, args, steps, tools, side effects, outputs.
2. **Decide.** Per decide.md: scope, then kind, then shape (Task only), then invocation (Task with side effects only). Ask only what can't be derived, ≤4 per batch. Subagent only → print the Output with `Result: stopped`, `Stopped: 2: standalone subagent; run /cdk:build-agent <input>` and end.
3. **Clarify loop.** Fill every item from step 1; per subagent also: task, tools, model, return shape, parallel-safe? Missing/ambiguous → AskUserQuestion (≤4 per batch); each batch's first question also offers Stop. Max 3 rounds. Stop → end, `Result: cancelled`.
4. **Draft.** Create → `${CLAUDE_SKILL_DIR}/assets/templates.md` by kind, plus frontmatter.md and body.md; subagent files also follow `${CLAUDE_SKILL_DIR}/../build-agent/references/practices.md`. Update → edit in place; keep existing sections; change only items settled in steps 1–3.
5. **Plan + Write.** Print the plan (files + one-line purpose each, incl. step 6 files), then write without asking.
6. **Maintain.** Scope is a plugin root (`.claude-plugin/plugin.json` exists) → in the same change update the docs that list its components (`README.md` skills/agents tables, `CLAUDE.md`, `.claude/rules/`) where they exist.
7. **Verify.**
   - Self-check: valid YAML; skill `name` kebab-case = dir name; `description` + `when_to_use` ≤1,536 chars; SKILL.md <500 lines; agent `name` unique, kebab-case, no `:`; `tools` names valid.
   - Plugin root → `validate-plugin`.
   - Spawn in one message, in parallel: `plugin-dev:skill-reviewer` per skill written (its SKILL.md path); `plugin-dev:plugin-validator` when an agent was written to a plugin location (plugin root, agent paths); `cdk:skill-auditor` with scope root (`~/.claude`, `<repo>/.claude`, or plugin root), repo root (for `.claude/rules/`; none for `~/.claude`), and every written path; read its `Rules:` and `Contracts:` (`Rules: none` or no rule matched → warning).
   - plugin-dev agents unavailable → skip them, note in Output `Checks`.
   - Merge all findings, deduplicated by file:line; collect agents' `Known issue:` lines. Any error or warning → fix; recurring or blocking → save per Known issues rule; re-verify (max 3 attempts).
8. **Evals (optional).** Opt-in handoff to `skill-creator:skill-creator` per `${CLAUDE_SKILL_DIR}/references/skill-creator.md`; not installed or unattended → skip and note in `Checks`. After it returns, re-verify once.
9. **Resolve findings.** Per resolve-findings.md. Edit only files this run wrote (never `resolve-findings.md`, `known-issues.md`, or `fallbacks.md` unless the request targeted them). Itemize the reviewer, validator, and auditor findings left after the step 7 cap (the Output `n findings` counts are only tallies), plus `Checks:` `fail` or `skipped`; each keeps its file:line and severity.

## Output

```text
Type: skill | orchestrator + subagents | subagent only
Kind: reference | task | background-only
Mode: create | update
Scope: personal | project | plugin
Files:
- <path> — <purpose>
Invoke: /[<plugin>:]<name> <args>
Checks: validate --strict <pass | fail | n/a>, skill-reviewer <pass | n findings | skipped — reason>, plugin-validator <pass | n findings | skipped — reason>, skill-auditor <pass | n findings>, rules <files | none>, contracts <ok | n findings | none>, evals <pass | n findings | skipped — reason>
Known issues: <saved store file | memory file | printed line>, … | none
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
