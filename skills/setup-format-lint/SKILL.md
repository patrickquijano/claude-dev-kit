---
name: setup-format-lint
description: Set up formatters and linters for the file types in the current repository. Detect file types (JS/TS, JSON, CSS/SCSS/Less, HTML, Markdown, YAML, Dockerfile, Shell, Python, PHP, C#, Go, XML), pick one formatter and one or more linters per type (dedicated tool first, Prettier as fallback; ask when more than one linter fits), install missing tools, write missing configs with recommended defaults per tool, and add ignore paths. Use only when the user explicitly asks to set up, install, add, or configure formatters, linters, Prettier, ESLint, Stylelint, markdownlint, HTMLHint, yamlfmt, yamllint, hadolint, shfmt, ShellCheck, Ruff, Black, Flake8, xmllint, Pint, PHP-CS-Fixer, PHPStan, PHP_CodeSniffer, CSharpier, dotnet format, or code style tooling, or when cdk:setup-project chains it. Do not use on your own after finishing a task.
allowed-tools: Bash(git rev-parse *) Bash(command -v *)
---

# Setup Format Lint

## Rules

- Analysis in subagent: step 2 spawns `cdk:format-lint-analyzer` (`mode=detect`) for file types, filled roles, candidates, package facts, and ignore candidates; step 6 spawns it with `mode=versions` (registry lookups only); step 10 spawns it with `mode=check`. It cannot ask or install; relay its `Gaps` and an `unknown` manager with AskUserQuestion. Pass only root, mode, answers to earlier `Gaps`, the `tools.md`, `package-manager.md`, and ignores paths, for `versions` the tools to install, the package dir, and the `## Versions` constraints, and for `check` the tools, package dir, manager, overrides, and the Dockerfile, shell, and XML file lists.
- No pinned versions: never write or remember a version number in this skill; every install and version-dependent config uses a version the `versions` step returned. A tool in `Unverified` is skipped with the reason, never installed from memory. Sources and constraints: `${CLAUDE_SKILL_DIR}/tools.md` `## Versions`.
- Idempotent: installed tool → skip install; configured tool → keep its config; ignore entry present → skip. Re-runs change nothing.
- Catalog, install channels, config files, defaults, check commands, overlaps, and ignore keys: `${CLAUDE_SKILL_DIR}/tools.md`.
- Config format: `.jsonc` > `.json` > `.yaml`; a tool supporting none of them uses its native format from the catalog.
- Never overwrite a user file; edits append only missing keys or entries. Configs are written only when missing.
- AskUserQuestion: at most 4 questions per call, 2–4 options each; recommended option first with its reason.
- Caps: analyzer respawn after `Gaps` 1. Each question is asked once per linter role (step 4), tool (step 7), or run (step 5); never re-ask the same question. More questions than fit one call → further calls until all are asked, at most 4 calls per step.
- Package dir, package manager, exec prefix, and `package.json` creation: `${CLAUDE_SKILL_DIR}/../setup-husky/package-manager.md`.
- Native tools change the machine, not only the repo: never install one unasked.
- Any Stop answer or failure → print the Output with `Stopped: <step>: <reason>` and end.
- Chained by `cdk:setup-project` via the Skill tool; never set `disable-model-invocation: true` (it blocks that invocation).
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/fallbacks.md`.
- Final step: follow `${CLAUDE_SKILL_DIR}/../build-skill/resolve-findings.md` (scope: edit; sources: `Check:`/`Problems:` lines, `Skipped tools:`, `Constraints:` that caused a skipped tool).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `setup-format-lint`.

## Workflow

1. **Pre-flight.** `git rev-parse --show-toplevel` fails → stop ("not a git repository"). Work from the git root.
2. **Detect.** Spawn `cdk:format-lint-analyzer` with root, `mode=detect`, `${CLAUDE_SKILL_DIR}/tools.md`, `${CLAUDE_SKILL_DIR}/../setup-husky/package-manager.md`, `${CLAUDE_SKILL_DIR}/../setup-husky/ignores.md`, and `${CLAUDE_SKILL_DIR}/../setup-git/ignores.md`. Take `File types`, `Uncovered`, `Lists` (Dockerfile, shell, and XML files for step 9), `Filled roles`, `Unfilled roles`, `Package`, and `Ignore candidates`; keep them for steps 3–9. `Gaps` non-empty → AskUserQuestion for each fact only the user can give, then respawn once.
3. **Existing.** The analyzer applied the catalog rules for a filled role (configured candidate; `none`-config tools installed; Prettier needs its plugin and no ignore for YAML, XML, PHP; toolchain tools only when sole candidate). Filled roles keep their tool.
4. **Choose tools.** Per `Unfilled roles` entry: one candidate → use it. More than one → formatter: use the catalog's first candidate, no question (two formatters on one type rewrite each other), and report it. Linter → AskUserQuestion `multiSelect: true` with the candidates, recommended first, since linters stack (for example PHPStan and PHP_CodeSniffer). Options follow the catalog order; a fallback option says it is the fallback. Group types that share one tool into one question.
5. **Package manager.** Only when an npm tool must be installed or checked. Use `Package` from step 2 (dir, `package.json` present, manager). Manager `unknown` (several lockfiles) → AskUserQuestion: npm (Recommended) | pnpm | yarn | bun. Missing `package.json` → create it per package-manager.md. Install, configs, and checks for npm tools use the package dir.
6. **Versions.** Only for tools to install or whose config depends on a version (ESLint, Prettier plugins, Stylelint). Spawn `cdk:format-lint-analyzer` with root, `mode=versions`, those packages and formulae by channel, the package dir, and `${CLAUDE_SKILL_DIR}/tools.md`. Take `Runtimes`, `Versions`, `Unverified`, and `Constraints`; keep them for steps 7–8 and the output. A tool or companion in `Unverified` → skip that tool with the reason (never reuse a remembered version); a tool whose required companion is unverified is skipped too. None to install → skip the step. Respawn on `Gaps` at most once.
7. **Install.** Only tools not yet installed. npm packages → one command with the package-manager.md add command, each as `<pkg>@<version>`. Composer packages → check the catalog prerequisites, then one `composer require --dev <pkg>:^<version> …` command. .NET tools (`--version <version>`) → check their prerequisites from the catalog. Missing prerequisite → skip the tool with the reason. Native tools → pick the first catalog channel whose command exists, with the `tools.md` `## Versions` install form (`uv`/`pipx` `==<version>`, `go install …@<version>`, brew installs the verified formula), then AskUserQuestion per tool: Run `<that command>` (Recommended) | Skip this tool | Stop. No channel → skip with the install page. Fail → quote the error line, stop.
8. **Configure.** Each chosen or kept tool without a config, whose catalog defaults are not `none` → write the catalog's config file with its recommended defaults, no question (they keep tools aligned, for example Prettier, yamllint, CSharpier, and PHP_CodeSniffer at 120 columns). A config whose format depends on the resolved version follows that version (ESLint needs `eslint/config`, else skipped per `tools.md` `## Versions`). Existing config → keep. `none` tools → write nothing.
9. **Overlaps + ignore paths.** Apply the catalog overlaps. Then take the analyzer's `Ignore candidates` (paths that exist and that the tool does not already ignore), keeping only the chosen and kept tools. None → skip. Else, no question: reuse `.gitignore` where the tool supports it (one list to maintain); other tools get the found path groups (build output, coverage, vendored deps, lockfiles, generated hooks; generated, not hand-written), appending only missing entries in the tool's syntax. `setup-husky/ignores.md` says never to create a config; here an ignore file may be created for a tool chosen in step 4.
10. **Check.** Spawn `cdk:format-lint-analyzer` with root, `mode=check`, `${CLAUDE_SKILL_DIR}/tools.md`, `${CLAUDE_SKILL_DIR}/../setup-husky/package-manager.md`, the installed tools (including kept tools), the package dir and manager from step 5 (else step 2 `Package`), any step 9 check-command overrides (HTMLHint `--ignore`, `dotnet format --exclude`), and the step 2 `Lists`. It runs each tool's catalog check command once (no writes) and returns `Checks` and `Problems`. Report counts and the first `Problems` lines; never auto-fix here, the user decides.
11. **Resolve findings.** Per resolve-findings.md. Fix a config this run wrote only when it is itself invalid or contradictory; never edit configs or ignore entries to clear a `Problems:` item. Lint or format fixes to user code and tool installs stay `needs-decision` (step 10: the user decides, never auto-fixed).
12. **Report** the output below.

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
Resolution: <n> resolved, <m> open (<id: reason; recommended fix>, …), <k> accepted | none | not run (stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
