---
name: setup-project
description: Set up a project's developer tooling in one run. Detect which of git signing and ignores, EditorConfig, formatters and linters, Husky hooks, and the Claude test hook are already configured, ask once which to run (missing ones recommended), then chain cdk:setup-git, cdk:setup-editorconfig, cdk:setup-format-lint, cdk:setup-husky, and cdk:setup-test-hook in that order. Use only when the user explicitly asks to set up a project or all setup tooling, e.g. "set up this project", "run all the setup skills", "bootstrap the repo tooling". Do not use on your own after finishing a task.
allowed-tools: Bash(git rev-parse *) Bash(git config --get *)
---

# Setup Project

## Rules

- Orchestration: follow `${CLAUDE_SKILL_DIR}/../ship-changes/orchestration.md`. Detection here is read-only; every write belongs to a chained skill.
- Fixed order: `cdk:setup-git` > `cdk:setup-editorconfig` > `cdk:setup-format-lint` > `cdk:setup-husky` > `cdk:setup-test-hook`. The later skills need a git repo; Prettier and shfmt read `.editorconfig`; Husky adds its paths to the formatter and linter configs that exist; the test hook goes last so it gates the finished tooling.
- One selection call: AskUserQuestion allows at most 4 options per question, so the 5 skills split into two multiSelect questions in that one call: "Repository" (git, EditorConfig) and "Tooling" (formatters and linters, Husky, test hook). Missing or partial setups get "(Recommended)" with the reason. Husky selected → git is also Recommended, its description noting that allowed signers (setup-git step 8) must be set or `cdk:setup-husky` stops.
- Selection is asked once. No loops or retries.
- Any sub-skill stop or failure → run step 6 on what the chained skills left, without re-running any skill, then print the Output with `Stopped: <step>: <reason>` and end. A step 3 cancel or `nothing-to-do` skips step 6 and prints `Resolution: not run (cancelled | nothing-to-do)`.
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/fallbacks.md`.
- Final step: follow `${CLAUDE_SKILL_DIR}/../build-skill/resolve-findings.md` (scope: ask-only; sources: `Stopped:` lines, `skipped (needs git)` skills, and open `Resolution:` lines of the chained setup skills).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `setup-project`.

## Workflow

1. **Pre-flight.** Root = `git rev-parse --show-toplevel`; fails → not a git repo yet (only `cdk:setup-git` can initialize one), root = cwd.
2. **Detect.** Read-only, cheap checks at the root; each skill is `configured`, `partial`, or `missing`:
   - git: `git config --get commit.gpgsign` is `true` and `git config --get user.signingkey` is set, plus `.gitignore` exists → configured; one of the two → partial; neither, or not a git repo → missing.
   - EditorConfig: `.editorconfig` with `root = true` and a `[*]` section → configured; file without either → partial.
   - Formatters and linters: any config the `setup-format-lint` catalog (`${CLAUDE_SKILL_DIR}/../setup-format-lint/tools.md`) lists exists → partial (a re-run fills missing roles); none → missing. Never report it as configured.
   - Husky: `.husky/commit-msg` or `.husky/post-commit` at the root or in a `package.json` dir → configured; `.husky/` without them → partial.
   - Test hook: `.claude/settings.json` `hooks.Stop` has a command running `run-tests.mjs` or a test runner → configured.
3. **Choose.** Print the detection table. AskUserQuestion, one call, two multiSelect questions per Rules; each option says its state and what the skill writes. Not a git repo → git is Recommended, and the description of every other option says it needs git. Nothing selected → `nothing-to-do`; skip step 6 and print `Resolution: not run (nothing-to-do)`.
4. **Run.** For each selected skill in the fixed order, invoke it via the Skill tool (`cdk:setup-git`, `cdk:setup-editorconfig`, `cdk:setup-format-lint`, `cdk:setup-husky`, `cdk:setup-test-hook`), no arguments. Read its Output `Result:` line and keep its `Next:`, `Stopped:`, and `Resolution:` lines for the Output. `done` or `nothing-to-do` → next skill. Root still not a git repo (git not selected) → mark each later skill `skipped (needs git)` and do not run it.
5. **Sub-skill stop.** `stopped`, `cancelled`, or a failure → stop, no ask; later setups may depend on it. Run step 6 on what the chained skills left (including the stopped skill's `Stopped:` line and the `skipped (needs git)` skills), without re-running any skill, then print the Output with `Stopped: 5: <skill> <its Stopped>`; `cdk:setup-git` while the root is still not a git repo → `Stopped: 5: setup-git stopped; later skills need git`.
6. **Resolve findings.** Per resolve-findings.md. Orchestrator: collect only what the chained skills left `open`, never re-analyze or re-fix them; for each give its recommended fix and which skill to re-run.
7. **Report** the output below.

## Output

```text
Detected: git <configured | partial | missing>, editorconfig <…>, format-lint <…>, husky <…>, test-hook <…>
Selected: <skills> | none
setup-git: <done | nothing-to-do | stopped | cancelled | skipped (needs git) | not selected>
setup-editorconfig: <…>
setup-format-lint: <…>
setup-husky: <…>
setup-test-hook: <…>
Next: <sub-skill Next lines> | none
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```

`Result:` = `stopped` when a chain stop ended the run, `cancelled` when the user cancelled the step 3 question, `nothing-to-do` when nothing was selected or every run skill returned `nothing-to-do`, else `done`.
