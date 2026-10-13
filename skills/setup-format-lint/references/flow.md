# Flow

Detail for the steps that branch.

## Contents

- Choose tools · Install · Resolve

## Choose tools

- One candidate → use it. Several formatters → the catalog's first, no question (two formatters on one type rewrite each other); report it.
- Linters stack (for example PHPStan and PHP_CodeSniffer) → AskUserQuestion `multiSelect: true`, candidates in catalog order, recommended first; a fallback option says it is the fallback. Group types that share one tool into one question.

## Install

- Only tools not yet installed. npm packages → one command: the `package-manager.md` add command, each package `<pkg>@<version>`.
- Composer packages → check the `tools.md` prerequisites, then `composer-require`. .NET tools → `dotnet-manifest` when needed, then `dotnet-tool-install`; missing prerequisite → skip the tool with the reason.
- Native tools → the first `tools.md` channel whose command exists (`uv-install`, `pipx-install`, `go-install`, `brew-install`). Ask per tool: Run `<that command>` (Recommended) | Skip this tool | Stop. No channel → skip with the install page.
- A failed install → quote the error line and stop.

## Resolve

- Sources: `Check:`/`Problems:`, `Skipped tools:`, `Constraints:` that caused a skip, `Uncovered` types, analyzer `Gaps`.
- Fix a config this run wrote only when it is invalid or contradictory, then re-run `mode=check` once for the touched tools. Never edit configs or ignore entries to clear a `Problems:` item; never auto-fix user code or install tools unasked.
- Everything else goes to `Open:` with its impact and recommended fix. Open items never change `Result:`.
