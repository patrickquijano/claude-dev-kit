# Init

Step 2 detail. Commands run by name from `commands.md`. Spec Kit treats a project with `.specify/` as initialized.

- `.specify/` and every required skill dir exist → skip.
- `.specify/` and every core dir exist, extension dirs missing → skip; step 3 adds them.
- `.specify/` exists, any core dir missing (initialized for another agent) → run `integration-install`, no question.
- No `.specify/` → tell the user init merges into the current directory (it writes `.specify/` and `.claude/skills/speckit-*/`, and may add hooks to `.claude/settings.json`), then run `init-here` (`--force` merge; not pre-approved, so the permission prompt guards it).
- A non-empty project (partial `.claude/skills/speckit-*`, a `.claude/settings.json` mentioning speckit, or a `.specify/` dir; an existing repo with only ordinary tracked files is not) → first AskUserQuestion ("Init here (merges with --force)", "Stop"). Unattended stops (`Stopped: 2: non-empty project, init needs confirmation`) and records it under `Open:`.
- Command fails → quote the error line, stop.
