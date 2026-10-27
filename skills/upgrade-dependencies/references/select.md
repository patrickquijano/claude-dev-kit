# Select

Details step 5 of `${CLAUDE_SKILL_DIR}/SKILL.md`.

The upgrade set is a decision question. Grill (decision questions only; gates keep their form): mine the conversation, files, and repo first, ask only what changes the output, and never fill a gap with an assumption. Use the structured-question tool (discover its name and limits at runtime; inside a delegated subagent ask in the main thread before delegating; unavailable → a numbered inline list, then stop for the answer). A fact-dependent question gets one web search per topic, official docs preferred, URLs cited; no search tool or source → "unverified", never an invented fact, source, or number. Before each question show the score table, the recommendation, and the option descriptions per `grill.md`. multiSelect: All patch and minor (Recommended; no breaking changes expected) | each major upgrade by name, with its breaking-change count in the description. Max 4 options per question and 4 questions per call; more majors → further calls until all are offered.

- Nothing selected → `Result: nothing-to-do`; declined majors go to `Skipped:` and `Open:`.
- Question dismissed → `Result: cancelled`.
