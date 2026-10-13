# Preflight

Step 1 detail.

- Input `score` or request is score/review/audit only → score-only: steps 2, 6, 7, 8, skip the mode bullets below; archetype = input's, else analyzer guess, no question. No README.md → tell user score-only needs README.md. Only non-`.md` README (`README`, `README.rst`, …) → AskUserQuestion: Convert to README.md (Recommended) | Stop; Stop → end, `Result: nothing-to-do`; Convert → leave score-only; continue as the Convert bullet below without re-asking. No README at all → report it, suggest create mode, end with `Result: nothing-to-do`.
- Only non-`.md` README (`README`, `README.rst`, …) → AskUserQuestion: Convert to README.md (Recommended) | Leave it, stop. Leave it, stop → end, `Result: nothing-to-do`. Convert → update mode on its content converted to Markdown; keep the old file and mention it in the Output.
