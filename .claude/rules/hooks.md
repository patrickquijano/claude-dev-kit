---
paths:
  - 'hooks/**'
  - '.claude/settings.json'
  - '.claude/hooks/**'
---

# Hooks

- Plugin hooks in `hooks/hooks.json` (`{"hooks": {"<Event>": [{"matcher": "...", "hooks": [...]}]}}`).
- Entry script = its event slug (`session-start`, `user-prompt-submit`, `post-tool-use`, `stop`, `pre-tool-use`), run via `node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/<event>.mjs"`; no exec bit. Logic and shared helpers live in `hooks/scripts/lib/` (`hook-io.mjs` holds stdin, project dir, and output helpers; reuse them, do not copy).
- Project hooks: `.claude/settings.json`, scripts `.claude/hooks/<event>.mjs` (same naming), run via `node "$CLAUDE_PROJECT_DIR/.claude/hooks/<event>.mjs"`.
- Narrow `matcher`; no `*` unless needed. File edits: `Write|Edit`.
- Always set `timeout` (seconds, default 600).
- `if` filters tool events only (`PreToolUse`, `PostToolUse`, …); other events + `if` = never runs.
- `Stop` fires every turn, no matcher, exit 2 = Claude keeps working. Gate on working-tree fingerprint (skip if unchanged since last run) → Q&A turns free, no infinite loop; outside git, skip when input `stop_hook_active` true.
- Hooks on the same event run in parallel, so never rely on order between hook entries; the plugin has one `UserPromptSubmit` dispatcher (`user-prompt-submit.mjs`) that runs its parts in order. The plugin `Stop` hook is `stop.mjs` alone.
- `/cdk:ship-release` writes the marker `git rev-parse --git-path cdk-ship-release` at pre-flight; `lib/task-end.mjs` leaves out only its commit step while it exists, `lib/session-start.mjs` warns about it on `startup|clear|fork`, and the skill deletes it once the run ends (merged and synced, or stopped).
- Plugin `PreToolUse` dispatcher (`hooks/scripts/pre-tool-use.mjs`, `Bash` with `if` for `git|gh|glab|claude`, plus the GitLab MCP `save_merge_request`): `lib/git-guard.mjs` first (block = exit 2 with stderr: force push, `--no-verify`, `HUSKY=0` outside CI, deleting the default branch, `gh pr merge --admin` during ship-release, `claude plugin eval`; ask = `permissionDecision: "ask"` JSON: bare `--force-with-lease`, commit or push on the default branch, `reset --hard`, `clean -f`, `branch -D`; tag pushes pass), then `runHook` in `lib/release-check.mjs`: read-only validation of PR/MR creation; exit 2 blocks with the fix, never writes, commits, or pushes (`.claude/rules/release.md`).
- Project `PostToolUse` validate hook (`.claude/hooks/post-tool-use.mjs`): hooks cannot run slash commands, so after a valid edit it prints a `systemMessage` naming `/reload-plugins` (plugin `skills|commands|agents|hooks`) and/or `/reload-skills` (project `.claude/` components) plus `additionalContext` to re-read project files; never prints a command twice per run.
- Plugin end-of-task logic (`lib/task-end.mjs`, run by the dispatcher): context only, never blocks, no state; injected on every prompt (question, `/`, and `!` included; only a missing or blank prompt returns nothing), and a step is left out only when it cannot run. Order: run the unit tests (when `lib/unit-tests.mjs` detects a command: `test:unit` or `test` script, pytest, go, cargo, phpunit; fix and re-run until green); the Graphify step (when the `graphify` binary is on PATH: `graphify update .` with a graph, the `graphify` skill when configured without one, else a hint to suggest `/cdk:setup-graphify`); `cdk:write-changelog` for Unreleased entries (needs git and a safe state; never a release or version bump); update README and related docs (always); `cdk:commit-changes` with `paths:` set to the files this task changed (needs git, a safe state, and no ship-release marker). Each step is conditional on `git status --porcelain` and on the task having changed what it covers.
- Plugin plan-mode logic (`lib/plan-mode.mjs`, run by the dispatcher): deterministic rules (`#plan`/`#noplan`; every other prompt asks, and Claude weighs its context to pick which option to recommend: Enter for multi-file, ambiguous, or risky work, Continue for questions, small specified changes, or work an approved plan covers; `/`, `!`, and machine-started turns `<task-notification>` and `<agent-message` skip) compare to live `permission_mode`; output is context only (ask the user with `AskUserQuestion`, then `EnterPlanMode` on yes; or `ExitPlanMode`, only for `#noplan` in plan mode, never for any other prompt), since no hook output can switch modes; always exit 0, no state.
- Error policy (fail fast): validate input first and return early; skip an expected condition (no git repo, missing tool or state file, first run, unwritable temp dir) with a catch narrowed by `err.code` (`SyntaxError` for corrupt JSON) that rethrows everything else, never a bare `catch {}`; lib code does not catch unexpected errors, they bubble to the one boundary per entry script (`runIfMain` in `lib/hook-io.mjs`, inline in the self-contained Husky and `run-tests` copies), which prints one capped `cdk <label>: <message>` line to stderr. Exit 1 for `user-prompt-submit` (exit 2 would erase the prompt), `session-start`, `post-tool-use`, `stop`, `post-commit`, `run-tests`; exit 2 for the gates `pre-tool-use` and `.claude/hooks/post-tool-use.mjs`. A failed formatter skips its linter; independent groups keep running.
- Completion gates: prefer `Stop` over `TaskCompleted`; `TaskCompleted` fires only on task-list task complete.
- Exit codes: `0` success, `2` block (stderr to Claude), other = non-blocking error.
- Stdout MUST be single JSON object (exit 0).
- User output: JSON `systemMessage`. Claude feedback: `decision: "block"` + `reason`, or `hookSpecificOutput.additionalContext`.
- `suppressOutput` no effect. `async` hooks can't show `systemMessage` to user.
- Idempotent: same input → same result, no extra side effects.
- Validate + quote all hook input; never `eval`.
- Unit tests per module, integration tests for the stdin→stdout contract: `.claude/rules/tests.md`.
- Verify: pipe sample stdin JSON into script, check exit code + stdout (plugin hook: smoke test in `.claude/CLAUDE.md` Commands).
- Docs: <https://code.claude.com/docs/en/hooks>
