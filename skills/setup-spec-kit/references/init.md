# Init

Step 2 detail. Commands run by name from `commands.md`. Spec Kit treats a project with `.specify/` as initialized.

- `.specify/` and every required skill dir exist → skip.
- `.specify/` and every core dir exist, extension dirs missing → skip; step 3 adds them.
- `.specify/` exists, any core dir missing (initialized for another agent) → run `integration-install`, no question.
- No `.specify/` and no partial `.claude/skills/speckit-*` and no `.claude/settings.json` mentioning speckit (an existing repo with only ordinary tracked files qualifies) → run `init-here` (it writes `.specify/` and `.claude/skills/speckit-*/`, and may add hooks to `.claude/settings.json`; `--force` merge, not pre-approved, so the permission prompt guards it).
- No `.specify/` but a partial `.claude/skills/speckit-*` or a `.claude/settings.json` mentioning speckit → files this skill did not create, which `--force` would overwrite: do not run `init-here`; stop (`Result: stopped`), list them under `Open:` with the fix (move them aside or run `specify init` by hand).
- Command fails → quote the error line, stop.
