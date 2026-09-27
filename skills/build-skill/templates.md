# Templates

- `<root>` = `~/.claude`, `.claude`, or plugin root.
- `<plugin>:` prefix only for plugin targets.
- Omit frontmatter keys not confirmed or equal to default.
- Strip all `# ...` template comments from output.

## Skill — `<root>/skills/<name>/SKILL.md`

```markdown
---
name: <kebab-case, = dir name>
description: <what it does>. Use when <trigger phrases/situations>.
argument-hint: '<args>'
disable-model-invocation: true # only if the user chose Disable in SKILL.md step 2
allowed-tools: <minimal list> # only if pre-approval needed
---

# <Title>

Input: $ARGUMENTS

## Rules

- <constraint>
- Issue → check `## Known issues` first. Fix for a recurring or workflow-blocking issue → append `- <symptom> → <fix>` to source SKILL.md (repo path, not plugin cache); not writable → print line for user.

## Workflow

1. <step>

## Output

<fixed structure>

## Known issues

- none
```

## Orchestrator — `<root>/skills/<name>/SKILL.md`

Same frontmatter as Skill; never `context: fork`. Body:

```markdown
# <Title>

Input: $ARGUMENTS

## Rules

- User interaction (AskUserQuestion) only here; subagents can't ask.
- Independent steps → spawn subagents in parallel (one message, many Agent calls).
- Pass each subagent only needed context; require concise return.
- Issue → check `## Known issues` first. Fix for a recurring or workflow-blocking issue (incl. subagent "Known issue:" lines) → append `- <symptom> → <fix>` to source SKILL.md; not writable → print line for user.

## Workflow

1. Clarify w/ user until inputs complete.
2. Spawn `[<plugin>:]<agent-a>` + `[<plugin>:]<agent-b>` in parallel: <task each>.
3. Merge results → <next step>.

## Output

<fixed structure>

## Known issues

- none
```

## Subagent — `<root>/agents/<name>.md`

```markdown
---
name: <kebab-case, no ":">
description: <when to delegate>. <one-line scope>.
tools: <minimal comma list>
model: <haiku|sonnet|opus|inherit> # only if not default
---

<Role, one line.>

## Task

1. <step>

## Return

<concise fixed structure; parent sees only this>
New issue + fix → add line `Known issue: <symptom> → <fix>`; parent records it.

## Known issues

- none
```
