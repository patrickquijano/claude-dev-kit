---
name: setup-project
description: Sets up git signing, EditorConfig, formatters and linters, Husky hooks, and test tooling in one run, asking once which to run. Use only when the user explicitly asks to set up a project's tooling.
allowed-tools: Bash(git rev-parse *) Bash(git config --get *)
---

# Setup Project

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `commands.md` row.

## Rules

- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Detection is read-only; every write belongs to a chained skill, invoked through the Skill tool with no arguments.
- Fixed order: `cdk:setup-git`, `cdk:setup-editorconfig`, `cdk:setup-format-lint`, `cdk:setup-husky`, `cdk:setup-testing`. Later skills need a git repo, Prettier and shfmt read `.editorconfig`, Husky adds its paths to existing formatter and linter configs, and testing goes last.
- One selection call, never repeated: AskUserQuestion allows 4 options per question, so use two multiSelect questions in one call, "Repository" (git, EditorConfig) and "Tooling" (formatters and linters, Husky, test tooling). Missing or partial setups get "(Recommended)" with the reason.
- Husky selected → git is also Recommended; `cdk:setup-husky` stops until signing and allowed signers are set.
- No loops or retries: each skill runs at most once; a chained stop ends the run.
- Never re-run, re-analyze, or fix a chained skill's leftovers; report them in `Open:`.
- AskUserQuestion unavailable (unattended, chained, or disabled) → select every `missing` and `partial` setup without asking. Write unavailable → stop with `Stopped: 4: write unavailable`.

## Workflow

1. **Pre-flight.** Root = Context → Repo root; `<none>` → not a git repo yet (only `cdk:setup-git` can initialize one), root = cwd.
2. **Detect.** Mark each setup `configured`, `partial`, or `missing` (`detect.md`).
3. **Choose.** Print the detection table, then ask once per Rules; nothing selected → `nothing-to-do`; cancelled → `cancelled`.
4. **Run.** Invoke each selected skill in the fixed order; keep its `Result:`, `Next:`, `Stopped:`, and `Open:` lines. Not a git repo and git not selected → mark later skills `skipped (needs git)`.
5. **Stop.** A chained `stopped`, `cancelled`, or failure ends the run (`stop.md`).
6. **Report.** Print the Output; list what the chained skills left under `Open:`.

## Files

- For detection signals per setup, see `${CLAUDE_SKILL_DIR}/references/detect.md`.
- For a chained skill that stops or fails, see `${CLAUDE_SKILL_DIR}/references/stop.md`.
- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.

## Output

```text
Detected: git <configured | partial | missing>, editorconfig <…>, format-lint <…>, husky <…>, testing <…>
Selected: <skills> | none
setup-git: <done | nothing-to-do | stopped | cancelled | skipped (needs git) | not selected>
setup-editorconfig: <…>
setup-format-lint: <…>
setup-husky: <…>
setup-testing: <…>
Next: <sub-skill Next lines> | none
Open: <item: reason; recommended fix and skill to re-run, …> | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```

`Result:` = `stopped` when a chain stop ended the run, `cancelled` when the user cancelled the question, `nothing-to-do` when nothing was selected or every run skill returned `nothing-to-do`, else `done`.
