---
name: setup-formatters
description: Sets up one formatter per repo file type at a verified version, with its config and ignore paths. Use only when the user explicitly asks to set up formatters.
compatibility: Claude Code only. Uses argument-hint, disable-model-invocation and CLAUDE_SKILL_DIR; claude.ai and API uploads reject unknown frontmatter keys.
argument-hint: '[--yes] [--no-plan]'
allowed-tools: Bash(git rev-parse *) Bash(git ls-files *) Bash(command -v *) Bash(npm view *) Bash(brew info *) Bash(node --version) Bash(php --version) Bash(dotnet --version) Bash(python3 --version) Bash(go version) Bash(node ${CLAUDE_SKILL_DIR}/scripts/pm-detect.mjs *) WebFetch(domain:pypi.org) WebFetch(domain:repo.packagist.org) WebFetch(domain:api.nuget.org) WebFetch(domain:proxy.golang.org)
disable-model-invocation: true
---

# Setup Formatters

Input: $ARGUMENTS (strip `--yes` and `--no-plan` first)

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `commands.md` row.

## Rules

- Ask (unattended: record) what the input and repo cannot answer.
- Flags: `--yes` is unattended (no plan mode, no questions, recommended options, assumptions under `Open:`); `--no-plan` skips plan mode only and every question is still asked. Only a flag the user passed counts. `--yes` never covers a native-tool install or overwriting an existing config: those are still asked, or skipped and listed under `Open:`.
- Spawn only the subagents named in the steps; briefs in `${CLAUDE_SKILL_DIR}/references/flow.md` `## Spawn briefs`.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Analysis in subagents: a read-only repo analyst (fallback: `cdk:format-lint-analyzer`) detects (step 2) and checks (step 9), and a read-only version resolver (fallback: `cdk:version-resolver`) resolves packages (step 5). They cannot ask or install; relay their `Gaps` and an `unknown` manager with AskUserQuestion. Each spawn has an inline fallback, so no step stops on an unavailable subagent.
- Spawn paths: pass the analyst `${CLAUDE_SKILL_DIR}/references/tools.md`, `configs.md`, `package-manager.md`, and `ignores.md`, and the resolver `tools.md`, as absolute paths.
- Spawn input: root, the step's mode, and answers to earlier `Gaps`; the resolver takes the packages to install and the package dir; the check adds the tools, package dir, manager, and the shell and XML file lists.
- Tool names come from `tools.md` plus the project manifests; a file type or tool not in them → ask the user for a tool name, never guess one.
- No pinned versions: never write or remember a version; every install and version-dependent config uses a version the `versions` step returned. A tool in `Unverified` is skipped with the reason.
- Idempotent: installed tool → skip install; ignore entry present → skip; ignores are explicit, never left to a tool's default skips. Ignore edits append only missing entries, so a re-run adds no duplicates.
- Existing config: show the diff against the catalog's keys and ask `Overwrite` | `Keep`; `Keep` is Recommended. Never overwrite without that answer.
- Write only non-default keys: a config key that restates the tool's default is never written; each key is checked against the tool's docs (`configs.md`).
- Config format: `.jsonc` > `.json` > `.yaml`; a tool supporting none uses its native format from the catalog.
- Native tools change the machine: never install one unasked. Git hooks and CI are out of scope; ask before touching either.
- Decision questions: at most 4 per call, 2-4 options each, the Recommended first. Grill (decision questions only; gates keep their form): mine the conversation, files, and repo first, ask only what changes the output. Use the structured-question tool (discover its name and limits at runtime; unavailable → a numbered inline list, then stop for the answer). A fact-dependent question gets one web search per topic, official docs preferred, URLs cited; no source → "unverified", never an invented fact. Before each question show the score table, the recommendation, and the option descriptions per `${CLAUDE_SKILL_DIR}/references/grill.md`.
- Caps: analyst respawn after `Gaps` 1; each question asked once; step 10 fix loop 1 pass and one extra check.
- No AskUserQuestion and no `--yes`: install and write nothing, ask nothing; print the Output with `Result: stopped`, `Stopped: 0: unattended` and the planned work under `Open:`.
- Pre-flight stop or cancel → print the Output with `Stopped:` and end. A later failure or cap → run step 10 once on what is left, then print the Output.

## Workflow

0. **Plan mode.** `--no-plan` or `--yes` → skip it (`Plan mode: skipped (--no-plan | --yes)`; the plan is printed and the work follows it; the declined stop does not apply). Otherwise enter plan mode first per `${CLAUDE_SKILL_DIR}/references/flow.md` `## Plan mode`; steps 1-5 run inside it. Before any install or file write, present the plan and wait for `ExitPlanMode` approval. Declined or unavailable → `Result: stopped`, `Stopped: 0: plan mode declined`; nothing is installed or written.
1. **Pre-flight.** Context Repo root `<none>` → stop ("not a git repository"). Work from the git root.
2. **Detect.** Spawn the analyst (detect); keep `File types`, `Unknown types`, `Lists`, `Filled roles`, `Unfilled roles`, `Package`, `Ignore candidates`. `Gaps` → ask, respawn once. Unavailable or malformed → detect inline (`flow.md` `## Spawn briefs`). A filled formatter role keeps its tool; a type absent from `tools.md` → ask for a tool name.
3. **Choose formatter.** One candidate → use it; several → the first, no question (`flow.md` `## Choose tools`).
4. **Package manager.** Only when an npm tool is installed or checked; run `pm-detect` (`commands.md`), ask on `unknown`; a missing `package.json` is created after approval (`package-manager.md`).
5. **Versions.** Only for tools to install or version-dependent configs; spawn the version resolver; `Unverified` → skip that tool. Unavailable or malformed → resolve inline (`flow.md` `## Spawn briefs`). At its end write the plan file and call `ExitPlanMode` (`flow.md` `## Plan mode`).
6. **Install.** After approval, create a missing `package.json`, then install missing formatters only, each at its resolved version (workspace-root flag per `package-manager.md`); native tools run the command the plan names (`flow.md` `## Install`).
7. **Configure.** Create each missing config with the catalog's non-default keys; an existing config → diff and ask `Overwrite` | `Keep` (`configs.md` `## Config files and defaults`, `## YAML alignment`).
8. **Overlaps and ignores.** Apply the catalog overlaps (`configs.md` `## Overlaps`), then append every ignore candidate that exists and is missing, in each tool's syntax (`ignores.md`).
9. **Check.** Spawn the analyst (check) for the installed and kept formatters in check mode; report counts and first `Problems` lines; never auto-fix user code.
10. **Resolve.** One pass, capped, each round entering plan mode first (unless skipped) (`flow.md` `## Resolve`): fix a config this run wrote only when itself invalid; re-run the check once; list leftovers in `Open:`.
11. **Report.** Print the Output.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For the formatter catalog, versions, and install channels (steps 2-6), see `${CLAUDE_SKILL_DIR}/references/tools.md`.
- For configs, check commands, overlaps, and YAML alignment (steps 7-9), see `${CLAUDE_SKILL_DIR}/references/configs.md`.
- For plan mode, tool choice, installs, the resolve pass (steps 0, 3, 6, 10), and spawn briefs (steps 2, 5, 9), see `${CLAUDE_SKILL_DIR}/references/flow.md`.
- For package dir, manager detection, and exec forms (steps 4, 6, 9), see `${CLAUDE_SKILL_DIR}/references/package-manager.md`.
- For ignore syntax and candidate paths (step 8), see `${CLAUDE_SKILL_DIR}/references/ignores.md`.
- For the package-dir and manager detector (step 4; run, never read), see `${CLAUDE_SKILL_DIR}/scripts/pm-detect.mjs`.
- For test cases, see `${CLAUDE_SKILL_DIR}/references/evals.md`.
- For the grill table, anchors, and sensitivity rule, read `${CLAUDE_SKILL_DIR}/references/grill.md` when a step asks a decision question.

## Output

```text
Plan mode: entered | already active | declined | skipped (--no-plan | --yes | <reason>)
File types: <type (count)>, … | unknown: <types>
Package manager: <pm> (<packageManager | lockfile | default | chosen>), package dir <pkg> | n/a
Formatters: <type>: <formatter> (<kept | chosen | only option>), …
Versions: <pkg: version (source)>, … | not needed
Installed: <packages/tools> | already present
Skipped tools: <tool: reason (including Unverified)> | none
Constraints: <pkg: limit — reason> | none
Configs: <file> (<written | overwritten | kept>), …
Ignores: <file: added paths>, … | up to date
Check: <tool: N problems>, … | not run
Problems: <tool: first lines>, … | none
Open: <item: impact; recommended fix, …> | none
Next: commit the changes | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
