---
name: setup-spec-kit
description: Install GitHub Spec Kit (`specify-cli`) if missing, initialize the current project with the Claude integration, install the agent-context, assess, and bug extensions with set priorities, and add Spec Kit paths to git, linter, and formatter ignores. Use when the user asks to set up, install, or initialize Spec Kit in a project.
allowed-tools: Bash(command -v *) Bash(uv tool install specify-cli) Bash(specify --version) Bash(specify init --here *) Bash(specify integration install claude) Bash(specify extension list *) Bash(specify extension add *) Bash(specify extension set-priority *) Bash(git rev-parse --is-inside-work-tree)
---

# Setup Spec Kit

## Rules

- Idempotent: check each step's state first and skip what is already done, so re-runs change nothing.
- Never pass `--force` to `specify extension add`; it overwrites an extension the user may have customized.
- Ignore files: append only missing entries; keep existing entries, order, and syntax form.
- Edit only linter and formatter configs that already exist; never create a config for a tool the project does not use. Only `.gitignore` may be created (step 4).
- Extensions and priorities (lower number wins): `agent-context` 10, `assess` 20, `bug` 30. `agent-context` manages the CLAUDE.md context section, so it outranks the workflow extensions; gaps leave room for later inserts.
- Required skill dirs: `${CLAUDE_SKILL_DIR}/required-skills.md`.
- Step 3: add or set-priority runs once per extension in the list (3), no retries. Only exception: one user-approved reinstall per extension whose skill dirs are missing.
- `specify extension remove` is deliberately not in `allowed-tools`: the reinstall deletes extension files, so its permission prompt is a second guard after the AskUserQuestion.
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `setup-spec-kit`.

## Workflow

1. **CLI.** `command -v specify` succeeds → skip. Else `command -v uv` fails → report "install uv: <https://docs.astral.sh/uv/>", stop. Else run `uv tool install specify-cli` (Spec Kit README command). Install fails → quote the error line, stop. Install succeeds but `command -v specify` still fails → tell the user to run `uv tool update-shell` and restart the shell, stop. Record `specify --version`.
2. **Init.** Spec Kit treats a project with `.specify/` as initialized.
   - `.specify/` and every required skill dir exist → skip.
   - `.specify/` and every core dir exist, extension dirs missing → skip; step 3 adds them.
   - `.specify/` exists, any core dir missing (initialized for another agent) → AskUserQuestion: Add Claude integration (Recommended) | Stop. Add → `specify integration install claude`.
   - No `.specify/` → tell the user init merges into the current directory: it writes `.specify/` and `.claude/skills/speckit-*/`, and may add hooks to `.claude/settings.json`. AskUserQuestion: Init (Recommended) | Stop. Init → `specify init --here --integration claude --force --non-interactive` (`--force` is required in a non-empty directory; `--non-interactive` prevents a hang on prompts).
   - Stop → `Init: declined`, `Result: cancelled`, `Stopped: Init: declined`; report, end the workflow.
   - Command fails → quote the error line, stop.
3. **Extensions.** Parse `specify extension list --json` (array of objects with `id`, `priority`). For each extension in Rules: absent → `specify extension add <id> --priority <n>`; priority differs → `specify extension set-priority <id> <n>`; else ok. Fail → quote the error line, continue with the next extension. Then check every required skill dir. Extension listed but any of its dirs missing → AskUserQuestion: Reinstall `<id>` (Recommended; runs `specify extension remove <id> --keep-config --force && specify extension add <id> --priority <n>`, keeps its config) | Stop. Reinstall → run it, re-check its dirs; still missing or fail → quote the error line, record them for the report. Stop → `Result: stopped`, `Stopped: Extensions: skill dirs missing`. Record any other missing dirs for the report.
4. **Git ignore.** Append missing lines to root `.gitignore`. No `.gitignore` → create it only when `git rev-parse --is-inside-work-tree` prints `true`; else skip. Lines, from the Spec Kit extension user guide:

   ```gitignore
   .specify/extensions/.cache/
   .specify/extensions/.backup/
   .specify/extensions/*/*.local.yml
   .specify/extensions/.registry
   ```

   Leave `.specify/.gitignore` alone; `specify init` manages it.

5. **Lint and format ignores.** Spec Kit overwrites its generated files on upgrade, so linting them only adds noise. Add `.specify/` and `.claude/skills/speckit-*/` to each existing config, in that tool's syntax. Keep `specs/` linted; the user writes it.
   - Line-based ignore files: `.prettierignore`, `.markdownlintignore`, `.stylelintignore`, and `.eslintignore` only when no `eslint.config.*` exists (flat config ignores that file).
   - `ignores` array: `.markdownlint-cli2.jsonc`, `.markdownlint-cli2.yaml`.
   - `eslint.config.*`: add `.specify/**` and `.claude/skills/speckit-*/**` to the existing global-ignores object (an object with only `ignores`); none → add `{ ignores: [...] }` as its own array element.
   - `.yamllint`, `.yamllint.yaml`, `.yamllint.yml`: add to `ignore:` in its existing form (block string or list); no `ignore:` → add a block string.
   - Config form not listed or not parseable → report the file, skip it.
6. **Report** the output below. Tell the user `.specify/assessments/` and `.specify/bugs/` (written by assess-spec-kit-idea and fix-spec-kit-bug) are committed with the work unless they add them to `.gitignore`.

## Output

```text
specify-cli: installed <version> | present <version>
Init: done | Claude integration added | skipped (already initialized) | declined
Extensions: agent-context <added|priority N→10|ok|failed>, assess <…>, bug <…>
Git ignore: <n> lines added to .gitignore | up to date | skipped (not a git repo)
Lint/format ignores: <file: added paths>, … | none found
Required skills: all present | missing <dirs>
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
