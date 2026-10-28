---
name: setup-spec-kit
description: Installs GitHub Spec Kit if missing, initializes the project with its assess and bug extensions, and updates ignore files. Use only when the user explicitly asks to set up Spec Kit.
argument-hint: '[--yes] [--no-plan]'
compatibility: Claude Code only. Uses disable-model-invocation and CLAUDE_SKILL_DIR; claude.ai and API uploads reject unknown frontmatter keys.
allowed-tools: Bash(command -v specify) Bash(command -v uv) Bash(specify --version) Bash(specify integration install claude) Bash(specify extension list *) Bash(specify extension set-priority *) Bash(node ${CLAUDE_SKILL_DIR}/scripts/plan-extensions.mjs *) Bash(git rev-parse --is-inside-work-tree)
disable-model-invocation: true
---

# Setup Spec Kit

Input: $ARGUMENTS (strip `--yes` and `--no-plan` first)

## Rules

- Ask (unattended: record) what the input and repo cannot answer.
- Flags: `--yes` = unattended: no plan mode, no questions, recommended options taken, assumptions under `Open:` (the unattended rules below apply); `--no-plan` skips plan mode only and every gate and question is still asked. Only a flag the user passed counts; never add one. `--yes` never covers a destructive step (admin-bypass merge, force-push, branch delete, `git reset --hard`, overwriting a dirty or unnamed file): it is still asked, and when nobody can answer it is skipped and listed under `Open:`.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Idempotent: check each step's state first and skip what is already done, so re-runs change nothing.
- Never pass `--force` to `specify extension add`; it overwrites an extension the user may have customized.
- Ignore files: append only missing entries; keep existing entries, order, and syntax form.
- Edit only linter and formatter configs that already exist; never create a config for a tool the project does not use. Only `.gitignore` may be created (step 4).
- Extensions and priorities (lower number wins): `agent-context` 10, `assess` 20, `bug` 30. `agent-context` manages the CLAUDE.md context section, so it outranks the workflow extensions.
- Required skill dirs: `${CLAUDE_SKILL_DIR}/references/required-skills.md`.
- Caps: `extension-add` or `extension-set-priority` runs once per extension, no retries; one plan-approved reinstall per extension whose skill dirs are missing; one retry pass over skipped ignore edits (step 6).
- `specify extension remove` and `specify extension add` are not in `allowed-tools`; the permission prompt guards them.
- AskUserQuestion unavailable: ask the pending question as plain text with its options, end the turn, and take the next message as the answer. Unattended (`--yes`, or no AskUserQuestion): ask nothing; take the Recommended option, except the global install (step 1) and `init-here` on a non-empty project (step 2), which stop and are recorded under `Open:`.
- Steps 0-2 stops and cancels: print the Output with `Open:` holding the item recorded at the stop (else `not run`) and end. A later stop still runs step 6 once, then prints the Output with `Result: stopped`.
- Leftovers (failed extensions, missing skill dirs, skipped ignore edits) go to `Open:` with a recommended fix; never loop past the caps.

## Workflow

0. **Plan mode.** `--no-plan` or `--yes` → skip it (no plan approval). Otherwise enter plan mode first (load `EnterPlanMode` with ToolSearch if deferred; already active → stay in it); read-only steps run inside it. Before creating, editing, or deleting any file or running any side-effect action, present the plan and wait for `ExitPlanMode` approval. Declined or unavailable → `Result: stopped`, `Stopped: 0: plan mode declined`; nothing is written.
1. **CLI.** `has-specify` succeeds → skip, else run `install-specify`; record `version`. Missing uv, declined or failed install: `${CLAUDE_SKILL_DIR}/references/cli.md`.
2. **Init.** Skip when `.specify/` and every required skill dir exist; else run `integration-install` or `init-here`. Cases, confirmation, and failures: `${CLAUDE_SKILL_DIR}/references/init.md`.
3. **Extensions.** Run `plan-extensions`; per `extensions.adds` run `extension-add`, per `priorityFixes` run `extension-set-priority`. Then read `skills.missing` from the plan for the missing required skill dirs. Failures and missing dirs: `${CLAUDE_SKILL_DIR}/references/extensions.md`.
4. **Git ignore.** Append the `gitignore.missing` lines from step 3's plan to root `.gitignore`. No `.gitignore` → create it only when `inside-work-tree` prints `true`; else skip. Leave `.specify/.gitignore` alone; `specify init` manages it.
5. **Lint and format ignores.** Spec Kit overwrites generated files on upgrade, so linting them is noise. Add `.specify/` and `.claude/skills/speckit-*/` to each existing config in that tool's syntax; keep `specs/` linted. Forms per tool: `${CLAUDE_SKILL_DIR}/references/ignores.md`.
6. **Fix leftovers.** Retry each skipped ignore edit once, only for files this skill writes. A failed CLI install or missing skill dir is only reported with its recommended command. **Plan mode (each round).** Skipped with `--no-plan` or `--yes`. Otherwise at the start of each iteration, before any fix, enter plan mode (load `EnterPlanMode` with ToolSearch if deferred), present the findings and proposed fixes, and wait for `ExitPlanMode` approval.
7. **Report.** Print the Output. Tell the user that `.specify/assessments/` and `.specify/bugs/`, where the assess and bug extensions write, are committed with the work unless added to `.gitignore`.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For the CLI install branches (step 1), see `${CLAUDE_SKILL_DIR}/references/cli.md`.
- For the init cases and confirmation (step 2), see `${CLAUDE_SKILL_DIR}/references/init.md`.
- For the core and extension skill dirs to verify (steps 2-3), see `${CLAUDE_SKILL_DIR}/references/required-skills.md`.
- For extension failures, reinstall, and the stop path (step 3), see `${CLAUDE_SKILL_DIR}/references/extensions.md`.
- For the latest tag, extension, missing skill dir, and `.gitignore` plan (steps 1, 3-4; run, never read), see `${CLAUDE_SKILL_DIR}/scripts/plan-extensions.mjs`.
- For each linter and formatter ignore syntax (step 5), see `${CLAUDE_SKILL_DIR}/references/ignores.md`.
- For test prompts and pass criteria, see `${CLAUDE_SKILL_DIR}/references/evals.md`.

## Output

```text
specify-cli: installed <version> | present <version>
Init: done | Claude integration added | skipped (already initialized)
Extensions: agent-context <added|priority N→10|ok|failed>, assess <…>, bug <…>
Git ignore: <n> lines added to .gitignore | up to date | skipped (not a git repo)
Lint/format ignores: <file: added paths>, … | skipped <file: reason> | none found
Required skills: all present | missing <dirs>
Open: <item: reason; recommended fix>, … | none | not run (stopped | cancelled, nothing recorded)
Next: run the Spec Kit workflow on a feature | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
