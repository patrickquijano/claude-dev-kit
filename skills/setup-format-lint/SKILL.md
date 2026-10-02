---
name: setup-format-lint
description: Set up formatters and linters for the file types in the current repository. Detect file types (JS/TS, JSON, CSS/SCSS/Less, HTML, Markdown, YAML, Dockerfile, Shell, Python, PHP, C#, Go, XML), pick one formatter and one or more linters per type (dedicated tool first, Prettier as fallback; ask when more than one fits), install missing tools, write missing configs with recommended defaults per tool, and add ignore paths. Use only when the user explicitly asks to set up, install, add, or configure formatters, linters, Prettier, ESLint, Stylelint, markdownlint, HTMLHint, yamlfmt, yamllint, hadolint, shfmt, ShellCheck, Ruff, Black, Flake8, xmllint, Pint, PHP-CS-Fixer, PHPStan, PHP_CodeSniffer, CSharpier, dotnet format, or code style tooling, or when cdk:setup-project chains it. Do not use on your own after finishing a task.
allowed-tools: Bash(git rev-parse *) Bash(git ls-files *) Bash(command -v *)
---

# Setup Format Lint

## Rules

- Idempotent: installed tool → skip install; configured tool → keep its config; ignore entry present → skip. Re-runs change nothing.
- Catalog, install channels, config files, defaults, check commands, overlaps, and ignore keys: `${CLAUDE_SKILL_DIR}/tools.md`.
- Config format: `.jsonc` > `.json` > `.yaml`; a tool supporting none of them uses its native format from the catalog.
- Never overwrite a user file without asking; edits append only missing keys or entries.
- AskUserQuestion: at most 4 questions per call, 2–4 options each; recommended option first with its reason. Custom settings use the automatic Other option.
- Caps: each question is asked once per role (step 4), tool (steps 6, 7), or run (steps 5, 8); never re-ask the same question. More questions than fit one call → further calls until all are asked, at most 4 calls per step.
- Package dir, package manager, exec prefix, and `package.json` creation: `${CLAUDE_SKILL_DIR}/../setup-husky/package-manager.md`.
- Native tools change the machine, not only the repo: never install one unasked.
- Any Stop answer or failure → print the Output with `Stopped: <step>: <reason>` and end.
- Chained by `cdk:setup-project` via the Skill tool; never set `disable-model-invocation: true` (it blocks that invocation).
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/fallbacks.md`.
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `setup-format-lint`.

## Workflow

1. **Pre-flight.** `git rev-parse --show-toplevel` fails → stop ("not a git repository"). Work from the git root.
2. **File types.** List files with `git ls-files` plus `git ls-files --others --exclude-standard`, so ignored files never count. Map each to a catalog key by extension, Dockerfile name, or (extensionless files) shell shebang. Count files per type; keep the Dockerfile, shell, and XML file lists for step 9. Types not in the catalog → `uncovered`.
3. **Detect existing.** A role (formatter, linter) of a type is filled when a catalog candidate for it is configured (config file present) or, for `none`-config tools, installed. Exceptions: Prettier fills the YAML, XML, or PHP formatter role only when its config loads that type's plugin (YAML needs none) and `.prettierignore` does not exclude the type; tools that ship with a toolchain (xmllint, gofmt, `go vet`, `dotnet format`) fill a role only when they are its only candidate. Filled roles keep their tool.
4. **Choose tools.** Per unfilled role: one candidate → use it. More than one → AskUserQuestion with the candidates, recommended first. Formatter → single select, since two formatters on one type rewrite each other. Linter → `multiSelect: true`, since linters stack (for example PHPStan and PHP_CodeSniffer). Options follow the catalog order; a fallback option says it is the fallback. Group types that share one tool into one question.
5. **Package manager.** Only when an npm tool must be installed or checked. Per package-manager.md: package dir, then a missing `package.json` (alternative Skip npm tools), then detect the manager. Install, configs, and checks for npm tools use the package dir.
6. **Install.** Only tools not yet installed. npm packages → one command with the package-manager.md add command. Composer packages → check the catalog prerequisites, then one `composer require --dev <packages>` command. .NET tools → check their prerequisites from the catalog. Missing prerequisite → skip the tool with the reason. Native tools → pick the first catalog channel whose command exists, then AskUserQuestion per tool: Run `<that command>` (Recommended) | Skip this tool | Stop. No channel → skip with the install page. Fail → quote the error line, stop.
7. **Configure.** Each chosen or kept tool without a config, whose catalog defaults are not `none` → AskUserQuestion: Write `<config file>` with recommended defaults (Recommended; list them, they keep tools aligned, for example Prettier, yamllint, CSharpier, and PHP_CodeSniffer at 120 columns) | Write a minimal `<config file>` (tool defaults); custom settings come through the automatic Other option. Write the catalog's config file. `none` tools → write nothing.
8. **Overlaps + ignore paths.** Apply the catalog overlaps. Then collect the catalog candidate paths (tools.md Ignore paths) that exist and that the tool does not already ignore (ignore file, config key, or an honored `.gitignore` option). None → skip. Else AskUserQuestion, multiSelect, options split across at most 4 questions with 2–4 options each (merge a single leftover option into the previous question): Reuse `.gitignore` where the tool supports it (Recommended; one list to maintain), then the found path groups (build output, coverage, vendored deps, lockfiles, generated hooks), each saying why it is skipped (generated, not hand-written). Write entries per tool in its syntax. `setup-husky/ignores.md` says never to create a config; here an ignore file may be created for a tool chosen in step 4.
9. **Check.** Run each installed tool's catalog check command once, `<x>` replaced by the package-manager.md exec form for installed binaries, (no writes) and count problems. Report counts; never auto-fix here, the user decides.
10. **Report** the output below.

## Output

```text
File types: <type (count)>, … | uncovered: <types>
Package manager: <pm> (<packageManager | lockfile | chosen>), package dir <pkg> | n/a
Tools: <type>: <formatter> + <linter>[, <linter>] (<kept | chosen | only option>), …
Installed: <packages/tools> | already present
Skipped tools: <tool: reason> | none
Configs: <file> (<written: recommended | tool defaults | custom> | kept), …
Ignores: <file: added paths>, … | up to date
Check: <tool: N problems>, … | not run
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
