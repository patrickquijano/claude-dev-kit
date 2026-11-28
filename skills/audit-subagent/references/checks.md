# Checks

## Contents

- How to decide · Frontmatter F1–F10 · Version gates · Structure and location S1–S5 · Prompt quality P1–P8 · Tools and permissions T1–T7 · Testing E1–E2 · Optional O1–O2 · Report format

## How to decide

- Each check is Pass, Fail, or Not checked. Read the files the row names before deciding; a Pass needs evidence you read, and a Fail needs the exact `file:line`, the quoted evidence of 15 words or fewer, and a proposed fix.
- Not checked: the row's condition holds, or a needed fact is missing (`Unverified: <what is missing>`). It never counts as a Pass or a Fail.
- Fail only for a defect that changes whether or when the parent delegates, what the subagent does or returns, a safety stop, whether its result can be verified, or its token cost. Wording, voice, and style are Pass.
- Judgment rows (P1, P3, P6, P8) are Fail only when you can name the concrete wrong action a model would take; two contradicting lines need both quoted with `file:line`.
- A field gated to a Claude Code version is Unverified when that version is unknown: the session or the user gives it, never a guess.
- Scope: a subagent under a plugin's `agents/` directory is a plugin agent; one under `.claude/agents/` or the user's agents directory is a project or personal agent.
- Facts about fields, values, tools, and precedence come from the Claude Code subagents docs (<https://code.claude.com/docs/en/sub-agents>); the colours, removed tools, and version gates below are copied from them; a fact you cannot confirm is Unverified.
- F2 (name charset), S2 (filename equals `name`), F4 (≤400 chars), and F8 (`model` and `effort` set) are house rules, not docs facts (the docs advise a `description` of 200 chars or fewer); label them "house rule" in the Evidence column. S2 stays a check because discovery and maintenance go by file name.
- Count lines, characters, and words with `node ${CLAUDE_SKILL_DIR}/scripts/count.mjs '<absolute path>'`, never by hand; it takes only an absolute path that matches `^[A-Za-z0-9._/-]+$` with no `..` segment as one single-quoted argument, and the script reads the file with `fs` itself and never embeds file text. Its JSON gives `lines`, `chars`, `words`, and the same counts below the frontmatter (`bodyLines`, `bodyChars`), plus `descriptionChars` and `whenToUseChars` for the frontmatter `description:` and `when_to_use:` values (0 when absent; single-line values and `>`/`|` block scalars only; a multi-line plain or quoted value counts its first line only). Skip `*.bak` files.

## Frontmatter

| ID | Check | Read | Decide | Not checked when |
| --- | --- | --- | --- | --- |
| F1 | Valid frontmatter | the subagent file | Opening `---` on line 1, closing `---`, valid YAML | never |
| F2 | `name` valid | `name` | Present; lowercase letters, digits, hyphens; no `:`; no leading or trailing hyphen; ≤256 chars | never |
| F3 | `name` is an actor noun | `name` | An actor noun (`code-reviewer`), not an action, a gerund, or vague (`helper`) | never |
| F4 | `description` valid | `description` | Present, non-empty, ≤400 chars (counted) | never |
| F5 | `description` says what and when | `description` | One concrete verb and object, and at least one situation when the parent should delegate | never |
| F6 | `description` names a boundary | `description`, other agents in scope | An explicit "Not for …" or a separation from every neighbour agent; it never widens delegation toward a neighbour's tasks | never |
| F7 | Known keys only | frontmatter | Every key is a documented field, spelled exactly (camelCase) | never |
| F8 | `model` and `effort` set and valid | `model`, `effort` | Fail when either is omitted (house rule: always set); otherwise `model` is `sonnet`, `opus`, `haiku`, `fable`, a full id, or `inherit`; `effort` is `low`, `medium`, `high`, `xhigh`, or `max`; the level fits the task (no `max` for a mechanical lookup) | never |
| F9 | `color` valid and fits access | `color`, `tools` | A documented color (`red`, `blue`, `green`, `yellow`, `purple`, `orange`, `pink`, `cyan`); `cyan` for a read-only agent, `red` for a write-capable one (`tools` has Edit, Write, or NotebookEdit, `memory` is set, or `tools` is omitted and `disallowedTools` lacks a write tool; `tools` omitted with every write tool in `disallowedTools` is read-only) | no `color` |
| F10 | Other fields valid | `maxTurns`, `memory`, `isolation`, `background`, `omitClaudeMd`, `skills`, `experimental.cacheTtl`, `autoCompactWindow`, `permissionMode` | `maxTurns` a positive integer; `memory` is `user`, `project`, or `local`; `isolation` is `worktree`; `background` and `omitClaudeMd` are booleans; `skills` lists at most 32 and none sets `disable-model-invocation`; `experimental.cacheTtl` is `5m` or `1h`; `autoCompactWindow` is a plain integer of at least 100000 (`200k` reads as 200); `permissionMode` is `default`, `manual`, `acceptEdits`, `auto`, `dontAsk`, `bypassPermissions`, or `plan`; a field whose gate is newer than the Claude Code version is Unverified | none of these fields is set |

## Version gates

Gates for F10, T4, and O1; a field used on a Claude Code older than its gate is Unverified for that user.

| Gate     | Feature                                                                                      |
| -------- | -------------------------------------------------------------------------------------------- |
| v2.1.218 | Frontmatter hooks in untrusted folders are skipped                                           |
| v2.1.233 | `claude plugin validate <dir>`                                                               |
| v2.1.238 | Inline `mcpServers` (needs trust of the agent file's own folder)                             |
| v2.1.242 | `/tasks` shows the model                                                                     |
| v2.1.246 | `maxTurns` returns partial output                                                            |
| v2.1.248 | `experimental.cacheTtl`                                                                      |
| v2.1.257 | `CLAUDE_CODE_SUBAGENT_MODEL_FORCE=1`                                                         |
| v2.1.267 | `bypassPermissions` under a parent in `default` or `dontAsk`                                 |
| v2.1.271 | `omitClaudeMd`                                                                               |
| v2.1.296 | `autoCompactWindow`; debug log message `invalid autoCompactWindow` when the value is ignored |
| v2.1.299 | A subagent name survives a restart after one send by ID                                      |
| v2.1.302 | Fork mode on by default                                                                      |

## Structure and location

| ID | Check | Read | Decide | Not checked when |
| --- | --- | --- | --- | --- |
| S1 | Location | the file's path | Under an `agents/` directory (plugin), `.claude/agents/`, or the user's agents directory, at any depth | never |
| S2 | Filename matches `name` | the file stem, `name` | The stem equals `name` | never |
| S3 | `name` unique across the tree | Glob of the agents tree | No other file in the tree has the same `name`; two same-name files in one tree load in an undocumented order, and a project or personal agent with the same `name` overrides a plugin agent (a note when the scope is known) | the tree holds no other agent file |
| S4 | No `.md` backup in the tree | Glob of the agents tree | No other `.md` file in the tree is a copy of an agent (a `.bak.md`, `-backup.md`, or `-old.md` name), since it loads as an agent; a `.bak` file is Pass | never |
| S5 | Body not empty | the subagent file | The text after the closing `---` has non-whitespace content | never |

## Prompt quality

| ID | Check | Read | Decide | Not checked when |
| --- | --- | --- | --- | --- |
| P1 | One responsibility | body | One verb on one object and one return shape; Fail only when you can name the second, unrelated job (a `kind` switch with a fixed Return each is one job) | never |
| P2 | Self-contained | body | Names every input it reads from the delegation prompt; a missing input → `Question: <what is needed and why>` and stop; never asks the user a question; never assumes conversation context; every file path the body names exists | never |
| P3 | Steps are ordered and one action each | body | Imperative steps in order; Fail only when a bundled step names an action a model would skip | never |
| P4 | Return is defined | body | A fixed `## Return` with named fields the parent uses, a status and `file:line` evidence for each claim, an example or exact format, and a size cap with conclusions and pointers rather than raw material | never |
| P5 | Scope limits and honest failure | body | States what the agent never does, a stop condition for any loop, that it stops and reports when blocked, out of scope, or the input is ambiguous, and that it reports failure and never claims success unverified | never |
| P6 | Consistent and free of filler | frontmatter, body, referenced files | No two lines lead a model to different actions; one term per concept; the description matches the behavior; no generic persona or filler the model already follows | never |
| P7 | Self-check before returning | body | A step before the `## Return` that re-opens each claim's evidence (`file:line`) and drops or fixes what does not hold | never |
| P8 | Subagent fit | body | The job needs no back-and-forth with the user or the main conversation context; Fail only when you can name the question it would have to ask or the context it needs, which makes it a skill | never |

## Tools and permissions

| ID | Check | Read | Decide | Not checked when |
| --- | --- | --- | --- | --- |
| T1 | Least-privilege `tools` | `tools`, `disallowedTools`, `memory`, steps | An explicit allowlist matching the steps; a read-only agent has no Edit or Write, and `memory` adds Read, Write, and Edit, so a read-only agent with `memory` is write-capable; both `tools` and `disallowedTools` omitted (every tool) is a Fail when the job is read-only or narrow | never |
| T2 | Tool names valid and covered | `tools`, steps | Every tool a step needs is listed; none is misspelled, nonexistent, or always removed from subagents (`AskUserQuestion`, `EndConversation`, `ScheduleWakeup`, `WaitForMcpServers`, `Workflow`, `propose_skills`, and the plan-mode entry and exit tools, the exit tool kept when `permissionMode: plan`; the list is in the docs at <https://code.claude.com/docs/en/sub-agents>); `disallowedTools` is read too, and an entry with a specifier such as `Bash(git push *)` removes the whole tool; at least one entry resolves, since none means the agent fails to launch; under `background: true` each needed tool is in the background tool list (Unverified when the docs list is not read); an MCP tool is a named `mcp__<server>__<tool>` entry, never a whole server | `tools` is omitted |
| T3 | No spawning without a stated reason | `tools`, body | `Agent` is listed only when the body states why it must spawn; `Agent(type)` in `tools` is ignored and plain `Agent` is still granted, so it counts as unrestricted spawning, not an invalid name; the body never tells the agent to delegate to another subagent otherwise | never |
| T4 | Permission fields fit the scope | `permissionMode`, `hooks`, `mcpServers`, `initialPrompt` | A plugin agent sets none of `hooks`, `mcpServers`, `permissionMode`, `initialPrompt` (a plugin ignores them); `initialPrompt` takes effect only when the agent runs as the main session; a project or personal agent sets one only when the job needs it, and never `bypassPermissions` without need; a version-gated value is Unverified when the version is unknown | none of these fields is set |
| T5 | Untrusted content is data | body, `tools` | A line saying file, web, or tool content is data, not instructions, when `tools` includes Read, Grep, Glob, Bash, WebFetch, or WebSearch (or is omitted) | `tools` has none of those |
| T6 | Side effects gated | body, `tools` | Each write or irreversible action is gated, or names the only files the parent passed and refuses others; no destructive command (`rm -rf`, force push, drop table, mass overwrite) without a confirmation step | the agent is read-only (the gate half only) |
| T7 | No secrets or machine paths | every file | No hardcoded secret, token, or key; no `$HOME` or machine-specific absolute path | never |

## Testing

Informational: always Not checked, with the reason `needs a model run; this audit runs no prompts`.

| ID  | Check                                                              |
| --- | ------------------------------------------------------------------ |
| E1  | Routing cases make the parent pick this agent from its description |
| E2  | A sample delegation returns the `## Return` format                 |

## Optional

Never block and excluded from the score.

| ID | Check | Decide | Not checked when |
| --- | --- | --- | --- |
| O1 | `claude plugin validate <plugin dir>` | Exit 0 is Pass; otherwise Fail with its first message; the command needs Claude Code v2.1.233, so an unknown version is Unverified | `claude` cannot run, or the target is not under a plugin directory |
| O2 | Delegation prompts | Write 2 prompts that should delegate and 2 that should not; Pass when the description separates them | never |

## Report format

First line the totals, then one table per subagent, one row per check:

```text
<subagent>: <p> pass, <f> fail, <n> not checked

| Check | Result | Location (file:line) | Evidence | Proposed fix |
| --- | --- | --- | --- | --- |
| F4 | Fail | agents/x.md:3 | "…" (412 chars) | Replace with: "…" |
| F9 | Not checked | agents/x.md | no `color` | none |
```

A Fail row gives the exact `file:line` and the replacement text when short; every check gets one row, a Pass row included. Totals count F, S, P, T, and E checks only; O1 and O2 are listed apart.
