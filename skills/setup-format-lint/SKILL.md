---
name: setup-format-lint
description: Sets up formatters and linters for the repository file types. Picks one formatter and one or more linters per type, installs missing tools at freshly verified versions, writes missing configs, and adds ignore paths. Use only when the user explicitly asks to set up formatters, linters, Prettier, or ESLint, or when cdk:setup-project chains it. Do not use on your own after finishing a task.
allowed-tools: Bash(git rev-parse *) Bash(command -v *)
---

# Setup Format Lint

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `commands.md` row.

## Rules

- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Analysis in a subagent: spawn `cdk:format-lint-analyzer` with `mode=detect` (step 2), `mode=versions` (step 6), `mode=check` (step 10). It cannot ask or install; relay its `Gaps` and an `unknown` manager with AskUserQuestion.
- Agent input: root, mode, and answers to earlier `Gaps`. `versions` adds the packages to install and the package dir; `check` adds the tools, package dir, manager, check-command overrides, and the Dockerfile, shell, and XML file lists.
- No pinned versions: never write or remember a version; every install and version-dependent config uses a version the `versions` step returned. A tool in `Unverified` is skipped with the reason.
- Idempotent: installed tool → skip install; configured tool → keep its config; ignore entry present → skip. Never overwrite a user file; edits append only missing keys or entries.
- Config format: `.jsonc` > `.json` > `.yaml`; a tool supporting none uses its native format from the catalog.
- Native tools change the machine: never install one unasked.
- AskUserQuestion: at most 4 questions per call, 2-4 options each, recommended first with its reason. Unavailable (or Write unavailable) → ask the pending question as plain text and end the turn.
- Caps: analyzer respawn after `Gaps` 1; each question asked once (more than fit one call → further calls, at most 4 per step); step 11 fix loop 1 pass and one extra `mode=check`.
- Unattended (chained, no AskUserQuestion): ask nothing; choose recommended options, skip native installs, and report the rest in `Open:`.
- Pre-flight stop or cancel → print the Output with `Stopped:` and end. A later failure or cap → run step 11 once on what is left, then print the Output.
- Chained by `cdk:setup-project` through the Skill tool; never set `disable-model-invocation`.

## Workflow

1. **Pre-flight.** Context Repo root `<none>` → stop ("not a git repository"). Work from the git root.
2. **Detect.** Spawn the analyzer (`mode=detect`); keep `File types`, `Uncovered`, `Lists`, `Filled roles`, `Unfilled roles`, `Package`, `Ignore candidates`. `Gaps` → ask, respawn once.
3. **Existing.** Filled roles keep their tool; the analyzer already applied the catalog rules for what counts as filled.
4. **Choose tools.** Per unfilled role: one candidate → use it; several formatters → the first, no question; linters → `multiSelect` question (`references/flow.md` `## Choose tools`).
5. **Package manager.** Only when an npm tool is installed or checked; ask on `unknown`, create a missing `package.json` (`package-manager.md`).
6. **Versions.** Only for tools to install or version-dependent configs; spawn the analyzer (`mode=versions`); `Unverified` → skip that tool.
7. **Install.** Missing tools only, each at its resolved version; native tools after a per-tool question (`references/flow.md` `## Install`).
8. **Configure.** Write each missing config with the catalog defaults, no question; existing config → keep (`tools.md` `## Config files and defaults`).
9. **Overlaps and ignores.** Apply the catalog overlaps, then add the analyzer's ignore candidates in each tool's syntax (`ignores.md`).
10. **Check.** Spawn the analyzer (`mode=check`) for the installed and kept tools; report counts and first `Problems` lines; never auto-fix user code.
11. **Resolve.** One pass, capped: fix a config this run wrote only when itself invalid; re-run `mode=check` once; list leftovers in `Open:`.
12. **Report.** Print the Output.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For the tool catalog, versions, install channels, configs, and overlaps (steps 3-9), see `${CLAUDE_SKILL_DIR}/references/tools.md`.
- For tool choice, installs, and the resolve pass (steps 4, 7, 11), see `${CLAUDE_SKILL_DIR}/references/flow.md`.
- For package dir, manager detection, and exec forms (steps 5, 7, 10), see `${CLAUDE_SKILL_DIR}/references/package-manager.md`.
- For ignore syntax and candidate paths (step 9), see `${CLAUDE_SKILL_DIR}/references/ignores.md`.

## Output

```text
File types: <type (count)>, … | uncovered: <types>
Package manager: <pm> (<packageManager | lockfile | default | chosen>), package dir <pkg> | n/a
Tools: <type>: <formatter> + <linter>[, <linter>] (<kept | chosen | only option>), …
Versions: <pkg: version (source)>, … | not needed
Installed: <packages/tools> | already present
Skipped tools: <tool: reason (including Unverified)> | none
Constraints: <pkg: limit — reason> | none
Configs: <file> (<written | kept>), …
Ignores: <file: added paths>, … | up to date
Check: <tool: N problems>, … | not run
Problems: <tool: first lines>, … | none
Open: <item: impact; recommended fix, …> | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
