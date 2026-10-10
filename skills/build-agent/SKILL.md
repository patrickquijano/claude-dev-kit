---
name: build-agent
description: Create or update a Claude Code custom subagent (agents/<name>.md) in a personal, project, or plugin scope. Interview for task, tools, model, return shape, and only the optional fields the task needs, check fit and the spawning skill's contract, then write and verify. Use only when the user explicitly asks to make, build, scaffold, fix, improve, or update a subagent or custom agent, e.g. "create a subagent that reviews Python security", "update the mr-reviewer agent". Do not use on your own after finishing a task.
argument-hint: '[description of the subagent, or name/path of an existing one]'
---

# Build Agent

Input: $ARGUMENTS

## Rules

- No hallucination. Every frontmatter field and behavior follows `${CLAUDE_SKILL_DIR}/practices.md` or the official docs (<https://code.claude.com/docs/en/sub-agents>). Unverified → omit and report.
- No assumption. Gap or ambiguity → AskUserQuestion: 2–4 options, recommended first with "(Recommended)", justification in its description. Derivable answer → don't ask.
- Token-efficient: omit default-valued frontmatter; body in concise prose, each rule with its reason beside it, no filler.
- Loops: clarify (step 3) max 3 rounds; verify-fix (step 8) max 3 attempts; clarify cap hit or any failure → print the Output with `Stopped: <step>: <reason>` and end; verify cap hit → run step 9 on what is left, then print the Output with `Stopped: 8: <reason>` and end.
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/fallbacks.md`.
- Never run `claude plugin eval` (LLM-graded); structural validation only.
- Final step: follow `${CLAUDE_SKILL_DIR}/../build-skill/resolve-findings.md` (scope: edit; sources: reviewer, validator, and auditor findings left after the verify cap, itemized; `Checks:` fail or skipped).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `build-agent`.

## Workflow

1. **Extract.** Mode: input names an existing agent name or path → update; find it under `~/.claude/agents/`, `<repo>/.claude/agents/`, and the plugin root `agents/` (recursive; match `name`, not filename), more than one match → ask which; read it. Else create. Update with nothing to change → print the Output, `Result: nothing-to-do`. From input (+ that file) pull: task, delegation triggers, inputs it reads, tools, side effects, return shape, spawning skill.
2. **Fit.** Create, or update that changes the task → check it against practices `## Fit`. Main conversation or a skill fits better → AskUserQuestion: Stop (Recommended; suggest `/cdk:build-skill`; justification names the mismatch) | Build agent anyway. Stop → end, `Result: cancelled`.
3. **Clarify loop.** Fill every item: location (create: infer when clear, plugin root → plugin, an existing scope that holds the spawning skill or sibling agents; ask personal | project | plugin otherwise; update: from the found path), name, description, task steps, tools, model, return shape, read-only or the exact writes, spawning skill (update: search `<root>/skills/*/SKILL.md` for the agent name; create: ask, or none), parallel-safe. Optional fields only when the task signals them, per practices `## Frontmatter`. Plugin location with a need for `hooks`, `mcpServers`, `permissionMode`, or `initialPrompt` → say plugin agents ignore them and offer personal or project instead. Spawning skill named → always edit its spawn step (inputs passed, Return fields used) in the same change. Missing or ambiguous → AskUserQuestion (≤4 per batch); each batch's first question also offers Stop. Repeat until complete, max 3 rounds. Stop → end, `Result: cancelled`.
4. **Draft.** Create → Subagent template in `${CLAUDE_SKILL_DIR}/../build-skill/templates.md` plus practices `## Body`. Update → edit in place; keep existing sections; change only items settled in steps 1–3. Spawning skill named → draft its spawn-step edits too.
5. **Plan.** Print the plan (files + one-line purpose each, incl. step 7 files), then write without asking.
6. **Write** files.
7. **Maintain.** Location is a plugin root (`.claude-plugin/plugin.json` exists) → in the same change update its `README.md` agents table, `CLAUDE.md`, and `.claude/rules/` for the added or changed agent, per its CLAUDE.md Maintenance rule.
8. **Verify.**
   - Self-check: valid YAML; opening `---` on line 1; `name` kebab-case, no `:`, not starting with `-`, unique in its agents directory; `description` present; `tools` and `disallowedTools` names valid; no field the scope ignores; no default-valued field; body has role line, `## Task` (step 1 names inputs), `## Return`; same `name` in another scope → warn which one wins.
   - Plugin root → `claude plugin validate --strict .`; else `claude plugin validate <agents dir>`.
   - Spawn in one message, in parallel: `plugin-dev:plugin-validator` for a plugin location (plugin root, agent path); `plugin-dev:skill-reviewer` per spawning-skill SKILL.md written; `cdk:skill-auditor` with location root (`~/.claude`, `<repo>/.claude`, or plugin root), repo root (for `.claude/rules/`; none for `~/.claude`), and every written path, including spawning-skill edits; read its `Rules:` and `Contracts:` (`Rules: none` or no rule matched → warning).
   - plugin-dev agents unavailable → skip them, note in Output `Checks`.
   - Merge findings, deduplicated by file:line; collect agents' `Known issue:` lines. Any error or warning → fix; recurring or blocking → save per Known issues rule; re-verify (max 3 attempts).
9. **Resolve findings.** Per resolve-findings.md. Edit only files this run wrote (never the shared `build-skill/` files unless the request targeted them). Itemize the reviewer, validator, and auditor findings left after the step 8 cap (the Output `n findings` counts are only tallies), plus `Checks:` `fail` or `skipped`; each keeps its file:line and severity.

## Output

```text
Mode: create | update
Location: <root>
Files:
- <path> — <purpose>
Invoke: @-mention [<plugin>:]<name> | spawned by [<plugin>:]<skill>
Checks: validate <pass | fail>, plugin-validator <pass | n findings | skipped — reason>, skill-reviewer <pass | n findings | n/a | skipped — reason>, skill-auditor <pass | n findings>, rules <files | none>, contracts <ok | n findings | none>
Reload: restart (new agents dir) | /reload-plugins (plugin) | none
Known issues: <saved memory file | printed line>, … | none
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
