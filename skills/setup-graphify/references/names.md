# Names

Step 6 detail. Commands run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`.

Placeholder names are left by `graphify update` or a label-less build. When some remain, say `label-missing` spends LLM tokens (an API key, or the `claude` CLI on its subscription; neither → graphify falls back to hub-based names, no LLM), then run it once: it keeps existing names and names only the placeholders. Fails → quote the error line, report the placeholders as left, continue. Grep again and report how many placeholders remain.
