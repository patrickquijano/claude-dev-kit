# Plan

Step 7 detail. Commands run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`.

- The planner's `Question:` lines → AskUserQuestion (header `Decision`, or `Clarify` for a `needs-clarification` item under `--self-review`; 2–4 options, recommended first), then respawn once with the answers.
- Groups it marks `blocked` are skipped in step 8 and their items stay `blocked`; `Conflicts` without a user answer, and items marked `needs-clarification` or `conflicting`, stay `needs-decision` and get no change.
- Under `--self-review`, an answered `needs-clarification` item takes the planner's new classification and is planned, an unanswered one stays `needs-decision`.
