# Body

Sources: <https://code.claude.com/docs/en/sub-agents>, the Agent SDK subagents page, Anthropic's prompting best practices, and its context-engineering and multi-agent-research posts. `check-agent` enforces the structure.

## Contents

- Receives and returns · Structure · Style · Missing input · Return · Lazy loading · Don'ts

## Receives and returns

- The body is the whole system prompt and replaces Claude Code's. The agent also gets the delegation prompt, CLAUDE.md (unless `omitClaudeMd`), a git status snapshot, preloaded skills, and environment details.
- It never gets the conversation history, files the parent already read, or invoked skills. Only its final message returns, and the parent may summarize it.

## Structure

1. A one-line role (prose), with its hard limit when it has one ("Read-only: never edit files.").
2. `## Task`: numbered steps. Step 1 names every input read from the delegation prompt, so the parent knows what to pass.
3. `## Return`: a fixed, concise structure with only the fields the parent uses; large artifacts go to a file, returned as a path. Aim for 1–2k tokens.

## Style

- State the reason beside each rule; phrase positively ("return paths only" over "don't paste code").
- No caps emphasis (`CRITICAL`, `MUST`), no filler, nothing CLAUDE.md already carries.
- State boundaries and what is out of scope; say read-only in prose as well as in `tools`.
- State a stop condition or cap for any loop; `maxTurns` is the backstop.

## Missing input

- The agent cannot ask the user (`AskUserQuestion` is removed). A missing required input → return `Question: <what is needed and why>` and stop; the spawning skill asks.

## Return

- Fields are fixed and named; each is used by the parent. A `Known issue: <symptom> → <fix>` line is allowed only when the parent skill stores known issues.
- Spawned by a skill: the skill reads only fields that exist in `## Return`.

## Lazy loading

- `skills:` preloads full content on every run; use it only when always needed.
- Without it, the Skill tool loads skills on demand; omit `Skill` from `tools` to block that.
- Inline body text is always paid for. In a plugin agent, `${CLAUDE_PLUGIN_ROOT}` is substituted, so an agent can read a file on demand; this is inferred behavior, never scored.

## Don'ts

- Never assume conversation context ("as discussed above").
- Never duplicate CLAUDE.md or another agent's body.
- Never leave a field in `## Return` that no caller reads.
