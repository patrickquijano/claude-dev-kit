# Templates

- `<root>` = `~/.claude`, `.claude`, or plugin root.
- `<plugin>:` prefix only for plugin targets.
- Omit frontmatter keys not confirmed or equal to default.
- Strip all `# ...` template comments from output.
- Target outside the `cdk` plugin (no `skills/build-skill/` sibling) → replace each `${CLAUDE_SKILL_DIR}/../build-skill/<file>` link line with that file's rules inline.

## Skill — `<root>/skills/<name>/SKILL.md`

````markdown
---
name: <kebab-case, = dir name>
description: <what it does>. Use when <trigger phrases/situations>.
# Side-effect skill → description: <what it does>. Use only when the user explicitly asks to <action>, e.g. "<phrase>", "<phrase>". Do not use on your own after finishing a task.
argument-hint: '<args>'
allowed-tools: <minimal list> # only if pre-approval needed
disable-model-invocation: true # only if the user explicitly asked to disable model invocation (build-skill step 2)
---

# <Title>

Input: $ARGUMENTS

## Rules

- <constraint>
- Reference files: `${CLAUDE_SKILL_DIR}/<file>`.
- <Loop> capped at <n> attempts; then print the Output with `Stopped: <step>: <reason>` and end.
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/fallbacks.md`. # only if the skill asks the user or writes files
- Final step: follow `${CLAUDE_SKILL_DIR}/../build-skill/resolve-findings.md` (scope: edit | ask-only; sources: <Output fields>). # only if the skill's Output reports findings; omit when it has its own equivalent capped loop
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `<name>`.

## Workflow

1. **Pre-flight.** <step>
2. **<Label>.** <step>
3. **Resolve findings.** Per resolve-findings.md. # last step; only if the skill reports findings

## Output

```text
<fixed structure>
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped) # only with the Resolve findings step
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
````

## Orchestrator — `<root>/skills/<name>/SKILL.md`

Same frontmatter as Skill; never `context: fork`. Body:

````markdown
# <Title>

Input: $ARGUMENTS

## Rules

- User interaction (AskUserQuestion) only here; subagents can't ask.
- Independent steps → spawn subagents in parallel (one message, many Agent calls).
- Pass each subagent only needed context; require concise return.
- <Loop> capped at <n> rounds; then print the Output with `Stopped: <step>: <reason>` and end.
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/fallbacks.md`.
- Final step: follow `${CLAUDE_SKILL_DIR}/../build-skill/resolve-findings.md` (scope: edit | ask-only; sources: <Output fields and agent returns>). # only if the Output reports findings
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `<name>`; it covers subagent `Known issue:` lines.

## Workflow

1. **Clarify.** Ask user until inputs complete.
2. **Spawn.** `[<plugin>:]<agent-a>` + `[<plugin>:]<agent-b>` in parallel: <task each>.
3. **Merge.** Results → <next step>.
4. **Resolve findings.** Per resolve-findings.md. # last step; only if the skill reports findings

## Output

```text
<fixed structure>
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped) # only with the Resolve findings step
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
````

## Subagent — `<root>/agents/<name>.md`

```markdown
---
name: <kebab-case, no ":">
description: <when to delegate>. <one-line scope>. Read-only. Spawned by the [<plugin>:]<skill> skill; do not use directly. # "Read-only." only when tools are read-only; "Spawned by …" only when a skill spawns the agent
tools: <minimal comma list>
model: <haiku|inherit> # only when needed: haiku cheap lookups, inherit otherwise
---

<Role, one line.>

## Task

1. <step>

## Return

<concise fixed structure; parent sees only this>
Issue hit + fix → add line `Known issue: <symptom> → <fix>`; parent decides whether to save it to auto memory.
```
