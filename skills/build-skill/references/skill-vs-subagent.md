# Skill or subagent

Default to a skill. Route to something else only when a row below clearly fits. The user's explicit choice wins: state the trade-off once, then build what they chose.

## Fit rubric

| Route                      | Fits when                                                                                                                             | Build                                                                                                          |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| Skill                      | A reusable procedure or knowledge applied during the main agent's work, with conversation context, inline                             | A skill (task, reference, or background-only)                                                                  |
| Subagent                   | A noisy or self-contained side task whose output the main thread will not reuse, enforced tool limits, or a cheaper model             | Nothing: give the outline below and stop unless the user picks a skill                                         |
| Skill with `context: fork` | An explicit task skill the user triggers that should run isolated, with a body that holds everything the task needs                   | A task skill with `disable-model-invocation: true` and `context: fork`; omit `agent` unless the user names one |
| Not a skill                | Always-on facts → CLAUDE.md; a rule that must always run → hook; missing tool or data access → MCP server; a one-off → a plain prompt | Nothing: name the right mechanism and stop                                                                     |
| Don't delegate             | Iterative back-and-forth, phases that share context, quick edits, latency-sensitive work                                              | A skill that runs inline, no fork                                                                              |

Signals to check, in order: Does the main thread need the intermediate work? (yes → skill, inline.) Is the output large and discarded? (yes → subagent or fork.) Must a rule hold every time with no judgment? (yes → hook.) Does it need a tool or data Claude lacks? (yes → MCP server.) Is it used once? (yes → plain prompt.) A convention Claude gets wrong twice belongs in CLAUDE.md; a playbook pasted a third time belongs in a skill.

## Subagent outline

build-skill never builds a subagent. For a subagent fit, explain why in two sentences and give at most 10 lines:

```text
name: <verb-first-or-role-name>
description: <what it does and when to delegate to it>
tools: <least-privilege list, read-only when possible>
model: <haiku | sonnet | opus | inherit, with a one-line reason>
prompt: <3–5 lines: input it receives, what it returns, what it must not do>
```

Then ask once: stop here, or build a skill anyway. Stopping is `Result: stopped`.

## Kind, for a skill

| Signal                                                                      | Kind            |
| --------------------------------------------------------------------------- | --------------- |
| Steps with side effects or a fixed sequence the user triggers               | Task            |
| Conventions, style, or domain knowledge Claude applies during other work    | Reference       |
| Context Claude should know that has no `/command` meaning (glossary, notes) | Background-only |

One skill, one job: several unrelated jobs → ask Split | Pick one | Stop. Name it by the action, verb-first (`review-code`, not `code-reviewer`).
