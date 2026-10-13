---
name: setup-spec-kit
description: Install GitHub Spec Kit (`specify-cli`) if missing, initialize the current project with the Claude integration, install the agent-context, assess, and bug extensions with set priorities, and add Spec Kit paths to git, linter, and formatter ignores. Use only when the user explicitly asks to set up, install, or initialize Spec Kit in a project. Do not use on your own after finishing a task.
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
- Step 3: `extension-add` or `extension-set-priority` runs once per extension in the list (3), no retries. Only exception: one user-approved reinstall per extension whose skill dirs are missing.
- `specify extension remove` is deliberately not in `allowed-tools`: the reinstall deletes extension files, so its permission prompt is a second guard after the AskUserQuestion.
- AskUserQuestion unavailable: follow `${CLAUDE_SKILL_DIR}/../shared/references/fallbacks.md`.
- Pre-flight stops (steps 1–2) and cancels → print the Output with `Resolution: not run (stopped | cancelled)`, `Stopped: <step>: <reason>`, and end. Any later stop (for example the step 3 Stop answer with `Extensions: failed` or `Required skills: missing`) → run step 6 (**Resolve findings.**) once on what is left, without re-entering the loop, then print the Output with `Result: stopped` and `Stopped: <step>: <reason>`.
- Final step: follow `${CLAUDE_SKILL_DIR}/../shared/references/resolve-findings.md` (scope: edit; sources: `Extensions:` failed, `Required skills: missing`, ignore edits skipped, `skipped (not a git repo)` items).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../shared/references/known-issues.md` with slug `setup-spec-kit` and store `${CLAUDE_PLUGIN_DATA}/known-issues`.

## Workflow

1. **CLI.** `has-specify` succeeds → skip. Else `has-uv` fails → report "install uv: <https://docs.astral.sh/uv/>", stop. Else run `install-specify` (Spec Kit README command). Install fails → quote the error line, stop. Install succeeds but `has-specify` still fails → tell the user to run `uv tool update-shell` and restart the shell, stop. Record `version`.
2. **Init.** Spec Kit treats a project with `.specify/` as initialized.
   - `.specify/` and every required skill dir exist → skip.
   - `.specify/` and every core dir exist, extension dirs missing → skip; step 3 adds them.
   - `.specify/` exists, any core dir missing (initialized for another agent) → run `integration-install`, no question.
   - No `.specify/` → tell the user init merges into the current directory (it writes `.specify/` and `.claude/skills/speckit-*/`, and may add hooks to `.claude/settings.json`), then run `init-here` (`--force` is required in a non-empty directory; `--non-interactive` prevents a hang on prompts); the permission prompt guards it (not pre-approved), no question.
   - Command fails → quote the error line, stop.
3. **Extensions.** Parse `extension-list` (array of objects with `id`, `priority`). For each extension in Rules: absent → `extension-add`; priority differs → `extension-set-priority`; else ok. Then check every required skill dir; an extension listed with any of its dirs missing → AskUserQuestion to reinstall (`extension-reinstall`) or stop. Failures, reinstall, and stop path: `${CLAUDE_SKILL_DIR}/references/extensions.md`.
4. **Git ignore.** Append missing lines to root `.gitignore`. No `.gitignore` → create it only when `inside-work-tree` prints `true`; else skip. Lines, from the Spec Kit extension user guide:

   ```gitignore
   .specify/extensions/.cache/
   .specify/extensions/.backup/
   .specify/extensions/*/*.local.yml
   .specify/extensions/.registry
   ```

   Leave `.specify/.gitignore` alone; `specify init` manages it.

5. **Lint and format ignores.** Spec Kit overwrites its generated files on upgrade, so linting them only adds noise. Add `.specify/` and `.claude/skills/speckit-*/` to each existing config, in that tool's syntax. Keep `specs/` linted; the user writes it. Forms per tool: `${CLAUDE_SKILL_DIR}/references/ignores.md`.
6. **Resolve findings.** Per resolve-findings.md. Resolve only what this skill installs or writes (extension registration, ignores); a failed CLI install or missing skill directory is reported with its recommended command.
7. **Report** the output below. Tell the user `.specify/assessments/` and `.specify/bugs/` (written by assess-spec-kit-idea and fix-spec-kit-bug) are committed with the work unless they add them to `.gitignore`.

## Output

```text
specify-cli: installed <version> | present <version>
Init: done | Claude integration added | skipped (already initialized)
Extensions: agent-context <added|priority N→10|ok|failed>, assess <…>, bug <…>
Git ignore: <n> lines added to .gitignore | up to date | skipped (not a git repo)
Lint/format ignores: <file: added paths>, … | skipped <file: reason> | none found
Required skills: all present | missing <dirs>
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
