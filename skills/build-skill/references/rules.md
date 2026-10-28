# Rules

Bundled snapshot of the skill rules. Read it, never guess a rule; the web is optional, for re-verification only (see Sources).

## Contents

- RULES · Frontmatter fields · Invocation matrix · Substitutions · Scope paths · Fallbacks · Manual checklist · Sources

## RULES

MUST

- `description`: ≤200 chars (count it), third person, what + when, key use case and trigger terms first.
- `name`: lowercase/digits/hyphens, ≤64 chars, matches the folder, no "anthropic" or "claude".
- Portable frontmatter only (name, description, license, compatibility, metadata, allowed-tools). Claude Code-only fields (context, agent, disable-model-invocation, etc.) are allowed but the skill must be marked Claude Code-only, with a warning that claude.ai/API uploads reject unknown keys.
- Body under 500 lines. Detail goes in references/ or scripts/, one level deep. References over 100 lines get a table of contents.
- Critical rules at the top (compaction keeps only the start).
- Set the invocation flags the user picked in the invocation question; keep least-privilege `allowed-tools`.
- `context: fork` only for explicit task skills. The body must hold everything the task needs; set `background: false` if the result is needed this turn.
- Paths: ${CLAUDE_SKILL_DIR}, forward slashes.
- **Own files**: the skill reads only its own bundled files through `${CLAUDE_SKILL_DIR}` and never through a `${CLAUDE_PLUGIN_ROOT}` path.
- **Skill calls**: the skill may invoke another skill. Prefer a plain-language line ("run the commit-changes skill"); the Skill tool or a `/plugin:name` command is a fallback. Never a skill command on a `Next:` line.
- **Subagent calls**: a spawn first describes the role in plain words ("spawn a read-only scorer subagent"); naming the plugin subagent (`cdk:rubric-scorer`) is allowed as a fallback beside it when the role does not route. Each spawn has an inline fallback for when no subagent is available. Never spawn the generic built-ins `Explore` or `general-purpose`.
- **Bypass flags**: a task skill accepts `--yes` (unattended: no plan mode, no questions, recommended options taken, assumptions under `Open:`) and, when it has a plan mode, `--no-plan` (skips plan mode only; every gate is still asked). Only a flag the user passed counts; a skill never adds one itself. `--yes` never covers a destructive step (admin-bypass merge, force-push, branch delete, `git reset --hard`, overwriting a dirty or unnamed file): it is still asked, and when nobody can answer it is skipped and listed under `Open:`.
- Fully qualified MCP names (Server:tool).
- At least 3 evals, tested on Haiku, Sonnet, and Opus, including routing cases (should-be-skill, should-be-subagent, should-be-neither, hybrid) when the skill makes a fit decision.

MUST NOT

- Descriptions over 200 chars, vague, or first/second person.
- Nested references, time-sensitive text, unknown or misspelled frontmatter keys.
- Reserved folder names `synced` and `anthropic-skills`.

DO

- Add only what Claude doesn't already know. Match rigidity to fragility. Give a default plus an escape hatch.
- Use consistent terminology and concrete examples. Use validate → fix → repeat loops.
- Use scripts for deterministic steps and say whether each is run or read. List dependencies.
- Use hooks for rules that must always hold.

DON'T

- Explain basics, offer many options, or use unjustified constants.

## Frontmatter fields

Opening `---` on line 1, valid YAML, closing `---`; booleans are `true` / `false`. Malformed YAML loads the body with empty metadata. Claude Code ignores unknown or misspelled keys silently, so names must match exactly. Portable fields are marked P; all others are Claude Code-only.

| Field                      | P | Type, default                                                           | Set when                                         |
| -------------------------- | - | ----------------------------------------------------------------------- | ------------------------------------------------ |
| `name`                     | P | kebab string; default the directory name; an action (verb-first)        | Always                                           |
| `description`              | P | string; default the first body line                                     | Always                                           |
| `license`                  | P | string                                                                  | Distribution needs it                            |
| `compatibility`            | P | string, ≤500 chars                                                      | Always for a Claude Code-only skill              |
| `metadata`                 | P | map; never reuse field names as keys                                    | Your own tooling needs it                        |
| `allowed-tools`            | P | space or comma string, or list; pre-approves tools, does not restrict   | Known-safe tools the skill uses, least privilege |
| `when_to_use`              |   | string, appended to `description` in the listing (together ≤1,536)      | Trigger phrases crowd the description            |
| `argument-hint`            |   | string, e.g. `[issue-number]`                                           | The skill takes arguments                        |
| `arguments`                |   | space string or list; names for `$name`                                 | The body reads named positional args             |
| `disallowed-tools`         |   | same shapes as `allowed-tools`                                          | Remove tools while active                        |
| `disable-model-invocation` |   | bool, false                                                             | Side-effect or timing-sensitive task             |
| `user-invocable`           |   | bool, true                                                              | `false` for background-only                      |
| `context`                  |   | `fork`                                                                  | Explicit task needing isolation                  |
| `agent`                    |   | subagent name; only with `context: fork`; omit unless the user names it | The user names one                               |
| `background`               |   | bool, true; only with `context: fork`                                   | `false` when the result is needed this turn      |
| `model`                    |   | `/model` value or `inherit`; this turn only                             | A different model is needed                      |
| `effort`                   |   | `low` `medium` `high` `xhigh` `max`                                     | A fixed effort is needed                         |
| `paths`                    |   | globs, comma string or list                                             | A reference that applies to certain files only   |
| `hooks`                    |   | hook config, kept for the session                                       | A rule must hold every time                      |
| `shell`                    |   | `bash` (default) or `powershell`                                        | Injection blocks need PowerShell                 |

Description: one job; third person; the words users say; distinctive. A side-effect task with `disable-model-invocation: true` ends with "Use only when the user explicitly asks to <action>." Never name a skill or subagent in it. Not triggering → add natural keywords; over-triggering → narrow it, or suggest `disable-model-invocation: true`.

## Invocation matrix

| Flags                            | User `/name` | Claude auto-invokes | Description in context |
| -------------------------------- | ------------ | ------------------- | ---------------------- |
| none                             | yes          | yes                 | yes                    |
| `disable-model-invocation: true` | yes          | no                  | no                     |
| `user-invocable: false`          | no           | yes                 | yes                    |
| both                             | no           | no                  | no                     |

`user-invocable: false` only hides the skill from the `/` menu. `disable-model-invocation: true` also blocks preloading into subagents.

| Kind and signal (default the recommendation starts from) | Set                                                                |
| -------------------------------------------------------- | ------------------------------------------------------------------ |
| Task with side effects                                   | `disable-model-invocation: true`                                   |
| Task, read-only or reversible                            | Omit both flags                                                    |
| Reference                                                | Omit both flags; add `paths` when it applies to certain files only |
| Background-only                                          | `user-invocable: false`                                            |
| Task needing isolation, body self-contained              | `context: fork`; never for a reference or background-only skill    |

## Substitutions

| Token                                            | Value                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| `$ARGUMENTS`                                     | All arguments as typed; appended as `ARGUMENTS: <value>` if absent |
| `$ARGUMENTS[N]`, `$N`                            | 0-based argument; quotes group                                     |
| `$name`                                          | Named argument declared in `arguments`                             |
| `${CLAUDE_SKILL_DIR}`                            | This skill's directory; use it in script and file paths            |
| `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}` | Plugin skills only; never used to reach another skill              |

Escape a literal dollar as `\$1.00`. Injection (an exclamation mark before a backticked command) runs before Claude reads the skill and aborts the invocation on a non-zero exit; prefer Read for the skill's own files. An injection in SKILL.md needs an `||` fallback, and none belongs in `references/`.

## Scope paths

| Scope   | Path                       | Invoked as    |
| ------- | -------------------------- | ------------- |
| User    | `~/.claude/skills/<name>/` | `/name`       |
| Project | `.claude/skills/<name>/`   | `/name`       |
| Plugin  | `<plugin>/skills/<name>/`  | `plugin:name` |

Same name at several levels: user over project; plugin skills are namespaced, so they never collide. Layout: `SKILL.md` plus only `references/` (docs Claude reads), `assets/` (templates copied into output), `scripts/` (run, not read); no dotfiles. Link every bundled file from `SKILL.md` with when to read it.

## Fallbacks

- No web → label rules "bundled snapshot", never guess.
- No node → walk the manual checklist below.
- Unknown plugin dir → ask.
- Missing frontmatter → treat as a create.
- Name collision → warn (plugin skills are namespaced with the plugin name).
- Do not hardcode version numbers.

## Manual checklist

Mirrors `scripts/validate-skill.mjs`; the bracketed code is the `rule` field it reports. Walk every line against the target, quote the evidence, and re-check after each fix (3 rounds at most).

1. [F1] `name`: kebab-case a-z0-9, ≤64 chars, equals the folder, no "anthropic" or "claude", verb-first.
2. [F3] `description`: present, ≤200 chars (count), no XML tags, names no skill or subagent; with `when_to_use` ≤1,536.
3. [F9] `description` has no "I", "you", "your", "we", "our", or "my".
4. [F6] Every frontmatter key is in the fields table; the YAML opens on line 1 and closes.
5. [F10] A Claude Code-only key is present → `compatibility` says "Claude Code" and warns that claude.ai/API uploads reject unknown keys.
6. [F11] `context: fork` → `background` is set (`false` when the result is needed this turn). [F12] `agent` only with `context: fork`.
7. [F13] `allowed-tools` lists Write, Edit, or Bash → the flags match the recorded invocation choice (warning when `disable-model-invocation: true` is absent; a recorded Allow choice → the warning is informational, not a deduction).
8. [B1] SKILL.md under 500 lines. [B9] A `## Files` section links every bundled file. [B8] SKILL.md never spawns or delegates to Explore or general-purpose; describe the role in plain words, never an agent name.
9. [B4] A reference over 100 lines has `## Contents` near the top. [B10] No reference links to another bundled `.md`.
10. [B6] No injection without an `||` fallback in SKILL.md, none in `references/`. [B11] No time-sensitive phrasing (dated facts, relative-time words, ISO dates outside a `Fetched:` stamp or code fence).
11. [L2] Only SKILL.md, references/, assets/, scripts/; no dotfile. [L4] No folder named `synced` or `anthropic-skills`.
12. [L3] Each `${CLAUDE_SKILL_DIR}/` link exists and stays inside the folder. [L5] No parent-directory path, absolute path, or backslash path.
13. [Q1] A task skill has `## Output` with `Result:`; [Q4] and a `Next:` line.
14. [S1] Never a `${CLAUDE_PLUGIN_ROOT}` path, a plugin-qualified skill command on a `Next:` line, or a skill command inside a `Next:` line. [S2] Each spawn describes the role in plain words (a named subagent only as a fallback beside it) and has an inline fallback (judgment-only: the script does not check it).
15. [Q2] A task skill's `argument-hint` has `[--yes]` (and `[--no-plan]` when it has a plan mode); `Input:` strips them; a Rules bullet states that `--yes` never covers a destructive step (judgment-only).

## Sources

Optional, for re-verification only; the rules above are a bundled snapshot and win offline.

- <https://code.claude.com/docs/en/skills>
- <https://agentskills.io/specification>
- <https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices>
