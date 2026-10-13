# Select

Details step 5 of `${CLAUDE_SKILL_DIR}/SKILL.md`.

AskUserQuestion, multiSelect: All patch and minor (Recommended; no breaking changes expected) | each major upgrade by name, with its breaking-change count in the description. Max 4 options per question and 4 questions per call; more majors → further calls until all are offered. Nothing selected → `Result: nothing-to-do`; `Skipped:` non-empty (declined majors stay `accepted`) → run step 11 once, else print `Resolution: not run (nothing-to-do)`; print the Output either way; question dismissed → `Result: cancelled`.
