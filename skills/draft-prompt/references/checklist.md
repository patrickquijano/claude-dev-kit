# Checklist

Section template, review groups, and two split patterns for a drafted prompt.

## Contents

- Section template · Review groups · Bug pattern · Oversized-input pattern

## Section template

| Section     | Must hold                                                                 |
| ----------- | ------------------------------------------------------------------------- |
| Context     | Read CLAUDE.md first; stack, files, current state, what was already tried |
| Task        | One verb plus one object, e.g. "Add retry to `fetchUser` in `[PATH?]`"    |
| Constraints | Scope lock (touch only the named files), no new dependencies              |
| Done when   | Checkable items (a command that exits 0) and the report format            |
| Guardrails  | Plan first, stop and ask on named triggers, stop when done                |

## Review groups

1. **Task definition.** Red flags: vague verb ("improve", "clean up", "fix up"); two tasks in one; no object.
2. **Context.** Red flags: no stack or file named; no current state; no mention of what failed before; claims not grounded in the repo.
3. **Outcome.** Red flags: no checkable done criterion; no report format; "make it good".
4. **Boundaries.** Red flags: no scope lock; new dependencies allowed by default; files outside the task editable.
5. **Agent control.** Red flags: no plan-first step; no stop-and-ask trigger (unclear requirement, failing check, destructive action); no stop when done.
6. **Reliability.** Red flags: over 250 words; unknowns guessed instead of placeholdered; contradictory lines; commit or push asked without confirmation.

## Bug pattern

1. Investigate read-only: reproduce, locate the cause, edit nothing.
2. Report the cause and the proposed fix, then wait.
3. Fix only that cause, then run the named check.

## Oversized-input pattern

- Split by independent outcome; one checkpoint per prompt (a passing check or a reviewed diff).
- Write the first prompt in full; give each later prompt a one-line stub, to expand after the previous checkpoint passes.
