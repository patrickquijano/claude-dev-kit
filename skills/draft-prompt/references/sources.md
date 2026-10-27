# Sources

Where project instructions can live, how to score the location question, and the fields to fill in before drafting.

## Contents

- Candidates · Location criteria · Fill-in fields

## Candidates

Glob each path; Read only the head of a hit (frontmatter `paths`, `@path` imports).

Auto-loaded by Claude Code (source: <https://code.claude.com/docs/en/memory>):

| Path                                      | Loaded                                                    |
| ----------------------------------------- | --------------------------------------------------------- |
| `CLAUDE.md`, `.claude/CLAUDE.md`          | At launch, shared with the team                           |
| `CLAUDE.local.md`                         | At launch, personal                                       |
| `.claude/rules/**/*.md`                   | At launch; with `paths` frontmatter, only for those files |
| `CLAUDE.md` in parent directories         | At launch                                                 |
| `CLAUDE.md` in subdirectories             | On demand, when Claude reads files there                  |
| `~/.claude/CLAUDE.md`, `~/.claude/rules/` | At launch, personal, all projects                         |
| Managed policy `CLAUDE.md`                | At launch, organization-wide                              |
| `AGENTS.md`, `.claude/AGENTS.md`          | Only when no `CLAUDE.md` exists                           |
| `@path` imports inside any file above     | With the importing file                                   |

Other conventions, not loaded by Claude Code; mark them "unverified" unless a search confirms them: `CONTRIBUTING.md`, `.github/copilot-instructions.md`, `.cursor/rules/`, `.cursorrules`, `GEMINI.md`, `docs/**/*guide*`.

## Location criteria

Fixed weights, printed before any option is scored. Every score cites `file:line` or the docs URL.

| Criterion                                       | Weight | 1                        | 3                | 5                             |
| ----------------------------------------------- | ------ | ------------------------ | ---------------- | ----------------------------- |
| Auto-loaded by Claude Code                      | 30     | Not loaded               | Loaded on demand | Loaded at launch              |
| Applies to the task's files (path scope or dir) | 25     | Unrelated area           | Repo-wide        | Scoped to the task's files    |
| Team-shared vs personal                         | 20     | Personal only            | Mixed            | Checked in and shared         |
| No conflict with other found files              | 15     | Contradicts another file | Overlaps         | Consistent with all           |
| Specific and current content                    | 10     | Generic or stale         | Partly specific  | Specific and recently changed |

Options are the found files or sets, plus "None". The question is multi-select; no hit → only "None".

## Fill-in fields

Ask for each field the input, conversation, or confirmed rules do not answer. Research first, then offer 2–4 candidate values with a cited example as evidence.

| Field                         | Where to research                         | Example evidence                           |
| ----------------------------- | ----------------------------------------- | ------------------------------------------ |
| Task verb and object          | Input, conversation                       | "add retry" + `fetchUser`                  |
| Target files                  | Grep for a named symbol, Glob for its dir | `src/api/user.ts:12`                       |
| Current state, what was tried | Input, conversation, `git log`, tests     | Failing test name; last commit touching it |
| Done-when check command       | `package.json` scripts, `Makefile`, CI    | `npm test` at `package.json:8`             |
| Report format                 | Confirmed rules, input                    | "Changed files and check output"           |
| Constraints                   | Confirmed rules, manifest                 | Scope lock; no new dependencies            |
| Stop-and-ask triggers         | Confirmed rules                           | Failing check, destructive action          |

Criteria come from the input's stated goal per `grill.md`. Suggested default: fits the stated goal 40 · grounded in repo evidence 30 · smallest scope 20 · checkable 10.
