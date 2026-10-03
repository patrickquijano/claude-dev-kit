---
name: setup-project
description: Set up a project's developer tooling in one run. Detect which of git signing and ignores, EditorConfig, formatters and linters, Husky hooks, and the Claude test hook are already configured, ask once which to run (missing ones recommended), then chain cdk:setup-git, cdk:setup-editorconfig, cdk:setup-format-lint, cdk:setup-husky, and cdk:setup-test-hook in that order. Use only when the user explicitly asks to set up a project or all setup tooling, e.g. "set up this project", "run all the setup skills", "bootstrap the repo tooling". Do not use on your own after finishing a task.
allowed-tools: Bash(git rev-parse *) Bash(git config --get *)
---

# Setup Project

## Rules

- Orchestration: follow `${CLAUDE_SKILL_DIR}/../ship-merge-request/orchestration.md`. Detection here is read-only; every write belongs to a chained skill.
- Fixed order: `cdk:setup-git` > `cdk:setup-editorconfig` > `cdk:setup-format-lint` > `cdk:setup-husky` > `cdk:setup-test-hook`. The later skills need a git repo; Prettier and shfmt read `.editorconfig`; Husky adds its paths to the formatter and linter configs that exist; the test hook goes last so it gates the finished tooling.
- One selection call: AskUserQuestion allows at most 4 options per question, so the 5 skills split into two multiSelect questions in that one call: "Repository" (git, EditorConfig) and "Tooling" (formatters and linters, Husky, test hook). Missing or partial setups get "(Recommended)" with the reason.
- Selection is asked once; a sub-skill stop asks once per stopped skill (step 5). No other loops or retries.
- Any Stop answer or failure → print the Output with `Stopped: <step>: <reason>` and end.
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/fallbacks.md`.
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `setup-project`.

## Workflow

1. **Pre-flight.** Root = `git rev-parse --show-toplevel`; fails → not a git repo yet (only `cdk:setup-git` can initialize one), root = cwd.
2. **Detect.** Read-only, cheap checks at the root; each skill is `configured`, `partial`, or `missing`:
   - git: `git config --get commit.gpgsign` is `true` and `git config --get user.signingkey` is set, plus `.gitignore` exists → configured; one of the two → partial; neither, or not a git repo → missing.
   - EditorConfig: `.editorconfig` with `root = true` and a `[*]` section → configured; file without either → partial.
   - Formatters and linters: any config the `setup-format-lint` catalog (`${CLAUDE_SKILL_DIR}/../setup-format-lint/tools.md`) lists exists → partial (a re-run fills missing roles); none → missing. Never report it as configured.
   - Husky: `.husky/commit-msg` or `.husky/post-commit` at the root or in a `package.json` dir → configured; `.husky/` without them → partial.
   - Test hook: `.claude/settings.json` `hooks.Stop` has a command running `run-tests.mjs` or a test runner → configured.
3. **Choose.** Print the detection table. AskUserQuestion, one call, two multiSelect questions per Rules; each option says its state and what the skill writes. Not a git repo → git is Recommended, and the description of every other option says it needs git. Nothing selected → `nothing-to-do`; skip to step 6.
4. **Run.** For each selected skill in the fixed order, invoke it via the Skill tool (`cdk:setup-git`, `cdk:setup-editorconfig`, `cdk:setup-format-lint`, `cdk:setup-husky`, `cdk:setup-test-hook`), no arguments. Read its Output `Result:` line and keep its `Next:` and `Stopped:` lines for the Output. `done` or `nothing-to-do` → next skill. Root still not a git repo (git not selected or skipped) → mark each later skill `skipped (needs git)` and do not run it.
5. **Sub-skill stop.** `stopped`, `cancelled`, or a failure of `cdk:setup-git` while the root is still not a git repo → no question; print the Output with `Stopped: 5: setup-git stopped; later skills need git`. Any other → AskUserQuestion: Stop here (Recommended; later setups may depend on it) | Skip it and continue with the rest. Skip → mark it `skipped` and continue step 4.
6. **Report** the output below.

## Output

```text
Detected: git <configured | partial | missing>, editorconfig <…>, format-lint <…>, husky <…>, test-hook <…>
Selected: <skills> | none
setup-git: <done | nothing-to-do | stopped | cancelled | skipped | skipped (needs git) | not selected>
setup-editorconfig: <…>
setup-format-lint: <…>
setup-husky: <…>
setup-test-hook: <…>
Next: <sub-skill Next lines> | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```

`Result:` = `stopped` when a chain stop ended the run, `cancelled` when the user cancelled the step 3 question, `nothing-to-do` when nothing was selected or every run skill returned `nothing-to-do`, else `done`.
