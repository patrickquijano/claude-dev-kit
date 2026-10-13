# Frontmatter

Sources: <https://code.claude.com/docs/en/skills>, agentskills.io spec. All fields optional; Claude Code ignores unknown keys. Set only fields the skill needs; omit defaults.

## Fields

| Field                      | Type / default             | Set when                                          | Omit when                               |
| -------------------------- | -------------------------- | ------------------------------------------------- | --------------------------------------- |
| `name`                     | kebab-case; = dir name     | always (plugin skills show as `<plugin>:<name>`)  | never                                   |
| `description`              | string                     | always: what + when, key use case first           | never                                   |
| `when_to_use`              | string                     | trigger detail that would bloat `description`     | `description` already fits              |
| `argument-hint`            | string                     | the skill takes input                             | no input                                |
| `arguments`                | string or list             | named `$name` substitutions are clearer than `$N` | `$ARGUMENTS` suffices                   |
| `allowed-tools`            | space/comma string or list | a step needs a pre-approved tool (minimal list)   | no tool needs approval                  |
| `disallowed-tools`         | space/comma string or list | a tool must be removed while the skill runs       | otherwise                               |
| `disable-model-invocation` | boolean; `false`           | only an unchained Task skill with side effects    | Reference, chained, read-only           |
| `user-invocable`           | boolean; `true`            | `false` for Background-only knowledge             | otherwise                               |
| `model`                    | string; `inherit` keeps    | the turn needs a specific model                   | session model is fine                   |
| `effort`                   | `low`…`max`                | the skill needs a fixed reasoning effort          | otherwise                               |
| `context`                  | `fork`                     | self-contained task that should run isolated      | needs user interaction or chains skills |
| `agent`                    | string; `general-purpose`  | with `context: fork`, a specific subagent type    | no fork                                 |
| `background`               | boolean; `true`            | with `context: fork`, `false` to wait for result  | no fork                                 |
| `paths`                    | glob string or list        | Reference skill tied to file globs                | otherwise                               |
| `hooks`                    | hook config                | skill-scoped hooks for the session after invoke   | otherwise                               |
| `shell`                    | `bash` or `powershell`     | `` !`cmd` `` blocks need PowerShell               | bash                                    |

Spec and portability fields: `license`, `compatibility` (max 500 chars), `metadata` (free map) are accepted but not acted on. Outside Claude Code (claude.ai uploads, Skills API) only `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools` are allowed; other keys are a hard error there.

## Invocation matrix

| Setting                          | User `/name` | Claude auto-loads | Other skills and hooks via Skill tool                |
| -------------------------------- | ------------ | ----------------- | ---------------------------------------------------- |
| default                          | yes          | yes               | yes                                                  |
| `disable-model-invocation: true` | yes          | no                | no (also blocks subagent preload and scheduled runs) |
| `user-invocable: false`          | no           | yes               | yes                                                  |

- `allowed-tools` grants approval only for the invoking turn and clears on the next message; it never restricts tools, and deny rules still win.
- `context: fork` runs SKILL.md as the subagent prompt without conversation history: only for explicit, self-contained tasks, never guideline-only skills.

## Description

- Third person, what + when, key use case first; concrete trigger phrases.
- `description` + `when_to_use` max 1,536 characters in the listing; all descriptions share a listing budget (~1% of context), so keep each short. `/skill-doctor` shows per-skill cost.
- No XML tags. Side-effect skills: no pushy wording; use `Use only when the user explicitly asks to <action>, e.g. "<phrase>". Do not use on your own after finishing a task.`
- Malformed YAML yields empty metadata and the skill silently misbehaves: validate the frontmatter.
