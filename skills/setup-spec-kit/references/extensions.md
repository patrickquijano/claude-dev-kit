# Extensions

Step 3 detail. Commands run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`.

Fail on `extension-add` or `extension-set-priority` → quote the error line, continue with the next extension. Then check every required skill dir. Extension listed but any of its dirs missing → AskUserQuestion: Reinstall `<id>` (Recommended; runs `extension-reinstall`, keeps its config) | Stop. Reinstall → run it, re-check its dirs; still missing or fail → quote the error line, record them for the report. Stop → `Result: stopped`, `Stopped: Extensions: skill dirs missing`. Record any other missing dirs for the report.
