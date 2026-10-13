# Combine

Step 3 detail.

- `derivable` → drop. `duplicate` → keep copy in file placement rules assign, drop others. List dropped items for step 4.
- `stale` → fix from facts `Commands`/paths; no match → ask. `vague` → rewrite from facts; else ask with "Omit" option.
- Each facts `Conflicts:` item → one question: keep A | keep B | merge; recommend input (newer) unless it breaks a verified fact. One side unwritable (`CLAUDE.local.md`, ancestor) → options: override in project file (name winner) | keep unwritable side; say it can't be edited.
- Each facts `Gaps:` item (architecture, precedence, boundaries, focused changes, done, maintenance) → one question with "Omit" option. Precedence → use the template order, no question.
- `principles` gap → no question; draft from `principles.md` (step 4 plan lists it). Default requirement with no repo support (e.g. no test runner) → omit and list under `Omitted:`.
- Max 4 per AskUserQuestion; more → next call. Record omitted items as `Omitted:` list. Nothing to ask → skip.
