---
name: setup-spec-kit
description: Installs GitHub Spec Kit (`specify-cli`) if missing, initializes the current project with the Claude integration, installs the agent-context, assess, and bug extensions with set priorities, and adds Spec Kit paths to git, linter, and formatter ignores. Use only when the user explicitly asks to set up, install, or initialize Spec Kit in a project. Do not use on your own after finishing a task.
allowed-tools: Bash(command -v *) Bash(uv tool install specify-cli) Bash(specify --version) Bash(specify integration install claude) Bash(specify extension list *) Bash(specify extension add *) Bash(specify extension set-priority *) Bash(git rev-parse --is-inside-work-tree)
---

# Setup Spec Kit

## Rules

- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Idempotent: check each step's state first and skip what is already done, so re-runs change nothing.
- Never pass `--force` to `specify extension add`; it overwrites an extension the user may have customized.
- Ignore files: append only missing entries; keep existing entries, order, and syntax form.
- Edit only linter and formatter configs that already exist; never create a config for a tool the project does not use. Only `.gitignore` may be created (step 4).
- Extensions and priorities (lower number wins): `agent-context` 10, `assess` 20, `bug` 30. `agent-context` manages the CLAUDE.md context section, so it outranks the workflow extensions; gaps leave room for later inserts.
- Required skill dirs: `${CLAUDE_SKILL_DIR}/references/required-skills.md`.
- Caps: `extension-add` or `extension-set-priority` runs once per extension, no retries; one user-approved reinstall per extension whose skill dirs are missing; one retry pass over skipped ignore edits (step 6).
- `specify extension remove` is deliberately not in `allowed-tools`: the reinstall deletes extension files, so its permission prompt is a second guard after the AskUserQuestion.
- AskUserQuestion unavailable: ask the pending question as plain text with its options, end the turn, and take the next message as the answer. Unattended (chained): ask nothing; take the Recommended option.
- Steps 1-2 stops and cancels: print the Output with `Open: not run` and end. A later stop still runs step 6 once, then prints the Output with `Result: stopped`.
- Leftovers (failed extensions, missing skill dirs, skipped ignore edits) go to `Open:` with a recommended fix; never loop past the caps.

## Workflow

1. **CLI.** `has-specify` succeeds → skip. Else `has-uv` fails → report "install uv: <https://docs.astral.sh/uv/>", stop. Else run `install-specify`. Install fails → quote the error line, stop. Install succeeds but `has-specify` still fails → tell the user to run `uv tool update-shell` and restart the shell, stop. Record `version`.
2. **Init.** Spec Kit treats a project with `.specify/` as initialized.
   - `.specify/` and every required skill dir exist → skip.
   - `.specify/` and every core dir exist, extension dirs missing → skip; step 3 adds them.
   - `.specify/` exists, any core dir missing (initialized for another agent) → run `integration-install`, no question.
   - No `.specify/` → tell the user init merges into the current directory (it writes `.specify/` and `.claude/skills/speckit-*/`, and may add hooks to `.claude/settings.json`), then run `init-here` with no question; the permission prompt guards it (not pre-approved).
   - Command fails → quote the error line, stop.
3. **Extensions.** Parse `extension-list` (objects with `id`, `priority`). Per extension in Rules: absent → `extension-add`; priority differs → `extension-set-priority`; else ok. Then check every required skill dir. Failures and missing dirs: `${CLAUDE_SKILL_DIR}/references/extensions.md`.
4. **Git ignore.** Append missing lines to root `.gitignore`. No `.gitignore` → create it only when `inside-work-tree` prints `true`; else skip. Lines (from the Spec Kit extension user guide):

   ```gitignore
   .specify/extensions/.cache/
   .specify/extensions/.backup/
   .specify/extensions/*/*.local.yml
   .specify/extensions/.registry
   ```

   Leave `.specify/.gitignore` alone; `specify init` manages it.

5. **Lint and format ignores.** Spec Kit overwrites generated files on upgrade, so linting them is noise. Add `.specify/` and `.claude/skills/speckit-*/` to each existing config in that tool's syntax; keep `specs/` linted. Forms per tool: `${CLAUDE_SKILL_DIR}/references/ignores.md`.
6. **Fix leftovers.** Retry each skipped ignore edit once, only for files this skill writes. A failed CLI install or missing skill dir is only reported with its recommended command.
7. **Report.** Print the Output. Tell the user `.specify/assessments/` and `.specify/bugs/` (written by assess-spec-kit-idea and fix-spec-kit-bug) are committed with the work unless added to `.gitignore`.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For the core and extension skill dirs to verify (steps 2-3), see `${CLAUDE_SKILL_DIR}/references/required-skills.md`.
- For extension failures, reinstall, and the stop path (step 3), see `${CLAUDE_SKILL_DIR}/references/extensions.md`.
- For each linter and formatter ignore syntax (step 5), see `${CLAUDE_SKILL_DIR}/references/ignores.md`.

## Output

```text
specify-cli: installed <version> | present <version>
Init: done | Claude integration added | skipped (already initialized)
Extensions: agent-context <added|priority N→10|ok|failed>, assess <…>, bug <…>
Git ignore: <n> lines added to .gitignore | up to date | skipped (not a git repo)
Lint/format ignores: <file: added paths>, … | skipped <file: reason> | none found
Required skills: all present | missing <dirs>
Open: <item: reason; recommended fix>, … | none | not run (stopped | cancelled)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
