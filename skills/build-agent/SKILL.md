---
name: build-agent
description: Create or update a Claude Code custom subagent (agents/<name>.md) in a personal, project, or plugin scope. Interview for task, tools, model, return shape, and only the optional fields the task needs, check fit and the spawning skill's contract, then write and verify. Use only when the user explicitly asks to make, build, scaffold, fix, improve, or update a subagent or custom agent, e.g. "create a subagent that reviews Python security", "update the cr-correctness-reviewer agent". Do not use on your own after finishing a task.
argument-hint: '[description of the subagent, or name/path of an existing one]'
---

# Build Agent

Input: $ARGUMENTS

## Rules

- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- No hallucination. Every frontmatter field and behavior follows `${CLAUDE_SKILL_DIR}/references/practices.md` or the official docs (<https://code.claude.com/docs/en/sub-agents>). Unverified → omit and report.
- No assumption. Gap or ambiguity → AskUserQuestion: 2–4 options, recommended first with "(Recommended)", justification in its description. Derivable answer → don't ask.
- Token-efficient: omit default-valued frontmatter; body in concise prose, each rule with its reason beside it, no filler.
- Loops: clarify (step 3) max 3 rounds; verify-fix (step 8) max 3 attempts; clarify cap hit or a failure before step 8 → print the Output with `Resolution: not run (stopped)`, `Stopped: <step>: <reason>`, and end; a failure in step 8 after findings exist runs step 9 first; verify cap hit → run step 9 on what is left, then print the Output with `Stopped: 8: <reason>` and end.
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/../shared/references/fallbacks.md`.
- Never run `claude plugin eval` (LLM-graded); structural validation only.
- Final step: follow `${CLAUDE_SKILL_DIR}/../shared/references/resolve-findings.md` (scope: edit; sources: reviewer, validator, and auditor findings left after the verify cap, itemized; `Checks:` fail or skipped).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../shared/references/known-issues.md` with slug `build-agent` and store `${CLAUDE_PLUGIN_DATA}/known-issues`.

## Workflow

1. **Extract.** Mode: input names an existing agent name or path → update; find it under `~/.claude/agents/`, `<repo>/.claude/agents/`, and the plugin root `agents/` (recursive; match `name`, not filename), more than one match → ask which; read it. Else create. Update with nothing to change → print the Output, `Result: nothing-to-do`. From input (+ that file) pull: task, delegation triggers, inputs it reads, tools, side effects, return shape, spawning skill.
2. **Fit.** Create, or update that changes the task → check it against practices `## Fit`. Main conversation or a skill fits better → AskUserQuestion: Stop (Recommended; suggest `/cdk:build-skill`; justification names the mismatch) | Build agent anyway. Stop → end, `Result: cancelled`.
3. **Clarify loop.** Fill every item (location, name, description, task steps, tools, model, return shape, writes, spawning skill, parallel-safe); missing or ambiguous → AskUserQuestion (≤4 per batch), max 3 rounds. Stop → end, `Result: cancelled`. Detail: `${CLAUDE_SKILL_DIR}/references/clarify.md`.
4. **Draft.** Create → Subagent template `${CLAUDE_SKILL_DIR}/assets/subagent.md` plus practices `## Body`. Update → edit in place; keep existing sections; change only items settled in steps 1–3. Spawning skill named → draft its spawn-step edits too.
5. **Plan.** Print the plan (files + one-line purpose each, incl. step 7 files), then write without asking.
6. **Write** files.
7. **Maintain.** Location is a plugin root (`.claude-plugin/plugin.json` exists) → in the same change update its `README.md` agents table, `CLAUDE.md`, and `.claude/rules/` for the added or changed agent, per its CLAUDE.md Maintenance rule.
8. **Verify.** Self-check, then `validate-plugin` for a plugin root, else `validate-agents`; spawn the reviewers in parallel; fix any error or warning, max 3 attempts. Detail: `${CLAUDE_SKILL_DIR}/references/verify.md`.
9. **Resolve findings.** Per resolve-findings.md. Edit only files this run wrote (never the shared `shared/` files unless the request targeted them). Itemize the reviewer, validator, and auditor findings left after the step 8 cap (the Output `n findings` counts are only tallies), plus `Checks:` `fail` or `skipped`; each keeps its file:line and severity.

## Output

```text
Mode: create | update
Location: <root>
Files:
- <path> — <purpose>
Invoke: @-mention [<plugin>:]<name> | spawned by [<plugin>:]<skill>
Checks: validate <pass | fail>, plugin-validator <pass | n findings | skipped — reason>, skill-reviewer <pass | n findings | n/a | skipped — reason>, skill-auditor <pass | n findings>, rules <files | none>, contracts <ok | n findings | none>
Reload: restart (new agents dir) | /reload-plugins (plugin) | none
Known issues: <saved store file | memory file | printed line>, … | none
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
