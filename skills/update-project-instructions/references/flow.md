# Flow

Branch detail for steps 3, 6, 7, and 8 of `SKILL.md`.

## Combine

- `derivable` → drop. `duplicate` → keep the copy in the file the placement rules assign, drop the others. List dropped items for step 4.
- `stale` → fix from facts `Commands` or paths; no match → ask. `vague` → rewrite from facts; else ask with an "Omit" option.
- Each facts `Conflicts:` item → one question: keep A | keep B | merge; recommend the newer input unless it breaks a verified fact. One side unwritable (`CLAUDE.local.md`, ancestor) → options: override in the project file (name the winner) | keep the unwritable side; say it cannot be edited.
- Each facts `Gaps:` item (architecture, precedence, boundaries, focused changes, done, maintenance) → one question with an "Omit" option. Precedence → use the template order, no question.
- `principles` gap → no question; draft from `principles.md`, listed in the step 4 plan. A default requirement with no repo support (e.g. no test runner) → omit and list under `Omitted:`.
- More than 4 questions → next call. Record omitted items for `Omitted:`. Nothing to ask → skip.

## Scorer input

Spawn `cdk:rubric-scorer` with `kind: project-instructions` and:

- File paths: the target memory file, its `@imports`, every file written in step 5, and every `.claude/rules/**/*.md` from facts `Memory files` (so Z1, P2, and E1 see all files).
- Rubric path `${CLAUDE_SKILL_DIR}/references/rubric.md` and principles path `${CLAUDE_SKILL_DIR}/references/principles.md`.
- The facts block with answers merged, and the `Omitted:` list.

## Improve

- Round counter +1. Spawn `cdk:rubric-improver` with: `kind: project-instructions`, root, rubric and principles paths, the file paths from `## Scorer input`, the scorer return (table and deductions), the facts block with answers merged, `Omitted:`, the round number, and last round's unresolved items.
- Its `Questions:` → AskUserQuestion with an "Omit" option (max 4 per call); re-spawn once with the answers. Unattended runs ask nothing: add them to `Omitted:`. Its `Blocked:` items go to `Open:`.
- After it returns, show its `Map:`, `Proactive:`, and `Expected:`, run `format-files` on its `Files changed:`, rescore (step 6), and report (step 7).
- Cap 3 rounds; deductions left after the cap go to `Open:`, never re-entered.
