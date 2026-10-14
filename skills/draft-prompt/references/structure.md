# Prompt structure

Draft every prompt in this shape. Omit a line whose section is empty or n/a per `checks.md`.

```markdown
Role: <one line>

Context: <project, stack + versions, starting state, prior failures>

Task: <one verb + target state>

Scope: <in-scope paths>. Do not touch <out-of-scope>. Allowed commands: <list>.

Constraints: <keep X; no new dependencies; ground facts in code/docs, say "unknown" if unsure>

Done when: <verifiable checks, e.g. `npm test` passes>

Stop and ask before: <review triggers>. Stop after 3 failed attempts and report.

Output: <format, audience, length bound>. Report at <checkpoints>; list assumptions.

Progress: log to <progress file path> (multi-slice tasks only; else omit this line)
```
