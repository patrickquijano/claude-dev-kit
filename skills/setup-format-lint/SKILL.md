---
name: setup-format-lint
description: Sets up a formatter and linters per repo file type at verified versions, with configs and ignore paths. Use only when the user explicitly asks to set up formatters or linters.
compatibility: Claude Code only. Uses disable-model-invocation and CLAUDE_SKILL_DIR; claude.ai and API uploads reject unknown frontmatter keys.
allowed-tools: Bash(git rev-parse *) Bash(git ls-files *) Bash(command -v *) Bash(npm view *) Bash(brew info *) Bash(node --version) Bash(php --version) Bash(dotnet --version) Bash(python3 --version) Bash(go version) Bash(node ${CLAUDE_SKILL_DIR}/scripts/pm-detect.mjs *) WebFetch(domain:pypi.org) WebFetch(domain:repo.packagist.org) WebFetch(domain:api.nuget.org) WebFetch(domain:proxy.golang.org)
disable-model-invocation: true
---

# Setup Format Lint

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `commands.md` row.

## Rules

- Ask (unattended: record) what the input and repo cannot answer.
- Spawn only the subagents named in the steps; briefs in `${CLAUDE_SKILL_DIR}/references/flow.md` `## Spawn briefs`.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Analysis in subagents: a read-only repo analyst detects (step 2) and checks (step 10), and a read-only version resolver resolves packages (step 6). They cannot ask or install; relay their `Gaps` and an `unknown` manager with AskUserQuestion. Each spawn has an inline fallback, so no step stops on an unavailable subagent.
- Spawn paths: pass the analyst `${CLAUDE_SKILL_DIR}/references/tools.md`, `configs.md`, `package-manager.md`, and `ignores.md` (the same directory), and the resolver `tools.md`, as absolute paths.
- Spawn input: root, the step's mode, and answers to earlier `Gaps`; the resolver takes the packages to install and the package dir; the check adds the tools, package dir, manager, check-command overrides, and the Dockerfile, shell, and XML file lists.
- No pinned versions: never write or remember a version; every install and version-dependent config uses a version the `versions` step returned. A tool in `Unverified` is skipped with the reason.
- Idempotent: installed tool → skip install; configured tool → keep its config; ignore entry present → skip; ignores are explicit, never left to a tool's `.gitignore` or default skips. Never overwrite a user file; edits append only missing keys or entries.
- Write only non-default keys: a config key that restates the tool's default is never written; each key is checked against the tool's docs (`configs.md`).
- Config format: `.jsonc` > `.json` > `.yaml`; a tool supporting none uses its native format from the catalog.
- Native tools change the machine: never install one unasked.
- AskUserQuestion: at most 4 questions per call, 2-4 options each, recommended first with its reason. Unavailable (or Write unavailable) → ask the pending question as plain text and end the turn.
- Caps: analyst respawn after `Gaps` 1; each question asked once (more than fit one call → further calls, at most 4 per step); step 11 fix loop 1 pass and one extra check.
- Unattended (no AskUserQuestion): ask nothing, skip the step 7 confirmation and report what was installed and written; choose recommended options, skip native installs, and report the rest in `Open:`.
- Pre-flight stop or cancel → print the Output with `Stopped:` and end. A later failure or cap → run step 11 once on what is left, then print the Output.

## Workflow

1. **Pre-flight.** Context Repo root `<none>` → stop ("not a git repository"). Work from the git root.
2. **Detect.** Spawn the analyst (detect); keep `File types`, `Uncovered`, `Lists`, `Filled roles`, `Unfilled roles`, `Package`, `Ignore candidates`. `Gaps` → ask, respawn once. Unavailable or malformed → detect inline (`flow.md` `## Spawn briefs`).
3. **Existing.** Filled roles keep their tool; the detect step already applied the catalog rules for what counts as filled.
4. **Choose tools.** Per unfilled role: one candidate → use it; several formatters → the first, no question; linters → `multiSelect` question (`references/flow.md` `## Choose tools`).
5. **Package manager.** Only when an npm tool is installed or checked; run `pm-detect` (`commands.md`), ask on `unknown`; a missing `package.json` is only noted here and created after the step 7 confirm (`package-manager.md`).
6. **Versions.** Only for tools to install or version-dependent configs; spawn the version resolver; `Unverified` → skip that tool. Unavailable or malformed → resolve inline (`flow.md` `## Spawn briefs`).
7. **Install.** Confirm once, then create a missing `package.json`, then install missing tools only, each at its resolved version (workspace-root flag per `package-manager.md`); native tools after a per-tool question (`references/flow.md` `## Install`).
8. **Configure.** Write each missing config with the catalog's non-default keys under step 7's confirmation; existing config → keep (`configs.md` `## Config files and defaults`, `## YAML alignment`).
9. **Overlaps and ignores.** Apply the catalog overlaps (`configs.md` `## Overlaps`), then add every ignore candidate that exists in each tool's syntax, never skipping one a tool already inherits or skips (`ignores.md`).
10. **Check.** Spawn the analyst (check) for the installed and kept tools; report counts and first `Problems` lines; never auto-fix user code.
11. **Resolve.** One pass, capped: fix a config this run wrote only when itself invalid; re-run the check once; list leftovers in `Open:`.
12. **Report.** Print the Output.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For the tool catalog, versions, and install channels (steps 3-7), see `${CLAUDE_SKILL_DIR}/references/tools.md`.
- For configs, check commands, overlaps, and YAML alignment (steps 8-10), see `${CLAUDE_SKILL_DIR}/references/configs.md`.
- For tool choice, installs, the resolve pass (steps 4, 7, 11), and spawn briefs (steps 2, 6, 10), see `${CLAUDE_SKILL_DIR}/references/flow.md`.
- For package dir, manager detection, and exec forms (steps 5, 7, 10), see `${CLAUDE_SKILL_DIR}/references/package-manager.md`.
- For ignore syntax and candidate paths (step 9), see `${CLAUDE_SKILL_DIR}/references/ignores.md`.
- For the package-dir and manager detector (step 5; run, never read), see `${CLAUDE_SKILL_DIR}/scripts/pm-detect.mjs`.
- For test cases, see `${CLAUDE_SKILL_DIR}/references/evals.md`.

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
Next: commit the changes | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
