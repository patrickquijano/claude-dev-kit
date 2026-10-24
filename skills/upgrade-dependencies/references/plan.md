# Plan

Details step 6 of `${CLAUDE_SKILL_DIR}/SKILL.md`; the researcher brief is in `${CLAUDE_SKILL_DIR}/references/spawns.md`.

1. Spawn one `cdk:topic-researcher` per selected major (and minor with breaking changes), at most 4 per message, in batches until all are done. Scope: the `Breaking:` URLs and `Affects:` hits. Its `Answer:` is the required edit per file.
2. Check each edit against Grep hits for the package's API in the repo. Drop an edit with no hit or one that targets another file; print the rest.
3. Patch and minor edits apply without asking.
4. Each major's edits → AskUserQuestion Apply | Skip. Declined → `Skipped:` and `Open:`. Unattended: skip the question and list majors under `Open:`.
