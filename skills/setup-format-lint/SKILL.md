---
name: setup-format-lint
description: Sets up a formatter and linters per repo file type at verified versions, with configs and ignore paths. Use only when the user explicitly asks to set up formatters or linters, or when chained.
allowed-tools: Bash(git rev-parse *) Bash(command -v *)
---

# Setup Format Lint

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `commands.md` row.

## Rules

- Rigor: never guess or invent: confirm each path, command, and fact by reading it; ask (unattended: record) what the input and repo cannot answer. Finish every step in full, think twice before each irreversible step, and re-check the result against these rules and the repo's standards before reporting.
- Efficiency: read only what a step needs, keep output terse, and take the fewest steps that meet the goal; when work is autonomous and splits cleanly, spawn independent cdk subagents in one parallel turn (`cdk:task-worker` for read-only work, `cdk:plan-implementer` for edits), never `Explore` or `general-purpose`.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Analysis in a subagent: spawn `cdk:format-lint-analyzer` with `mode=detect` (step 2) and `mode=check` (step 10), and `cdk:version-resolver` with `kind: packages` (step 6). They cannot ask or install; relay their `Gaps` and an `unknown` manager with AskUserQuestion.
- Agent input: root, mode (analyzer), and answers to earlier `Gaps`. The resolver takes root, the packages to install, and the package dir; `check` adds the tools, package dir, manager, check-command overrides, and the Dockerfile, shell, and XML file lists.
- No pinned versions: never write or remember a version; every install and version-dependent config uses a version the `versions` step returned. A tool in `Unverified` is skipped with the reason.
- Idempotent: installed tool → skip install; configured tool → keep its config; ignore entry present → skip; ignores are explicit, never left to a tool's `.gitignore` or default skips. Never overwrite a user file; edits append only missing keys or entries.
- Write only non-default keys: a config key that restates the tool's default is never written; each key is checked against the tool's docs (`configs.md`).
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
6. **Versions.** Only for tools to install or version-dependent configs; spawn `cdk:version-resolver` (`kind: packages`); `Unverified` → skip that tool.
7. **Install.** Missing tools only, each at its resolved version (workspace-root flag per `package-manager.md`); native tools after a per-tool question (`references/flow.md` `## Install`).
8. **Configure.** Write each missing config with the catalog's non-default keys, no question; existing config → keep (`configs.md` `## Config files and defaults`, `## YAML alignment`).
9. **Overlaps and ignores.** Apply the catalog overlaps (`configs.md` `## Overlaps`), then add every ignore candidate that exists in each tool's syntax, never skipping one a tool already inherits or skips (`ignores.md`).
10. **Check.** Spawn the analyzer (`mode=check`) for the installed and kept tools; report counts and first `Problems` lines; never auto-fix user code.
11. **Resolve.** One pass, capped: fix a config this run wrote only when itself invalid; re-run `mode=check` once; list leftovers in `Open:`.
12. **Report.** Print the Output.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For the tool catalog, versions, and install channels (steps 3-7), see `${CLAUDE_SKILL_DIR}/references/tools.md`.
- For configs, check commands, overlaps, and YAML alignment (steps 8-10), see `${CLAUDE_SKILL_DIR}/references/configs.md`.
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
Next: /cdk:setup-husky | /cdk:commit-changes | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
