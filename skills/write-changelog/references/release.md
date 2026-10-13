# Release

Details step 5 (**Draft**) in release mode. Format and workflows: `${CLAUDE_SKILL_DIR}/references/format.md` `## Workflows`.

Version missing → AskUserQuestion with candidates from the entries' types (Removed or breaking → major, Added → minor, else patch; computed from the latest released version (none → 0.1.0 or 1.0.0), each with its reason) plus Stop; date missing → AskUserQuestion: Today (Recommended; use the SessionStart date) | Enter another | Stop. Version already in the file and also in the base branch's `CHANGELOG.md` → stop, `Stopped: 5: version exists`; only in this branch's file → update that unmerged section in place per `format.md` `## Workflows`.
