# Frontmatter

Sources: <https://code.claude.com/docs/en/skills> (wins on conflict), <https://agentskills.io/specification>, <https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices>. Claude Code ignores unknown or misspelled fields silently, so names must match exactly.

## Contents

- Format · Fields · Invocation matrix · Description · Don'ts

## Format

- Opening `---` on line 1, valid YAML, closing `---`. Malformed YAML loads the body with empty metadata: `/name` works, Claude cannot match the description.
- Booleans: `true` / `false`.
- Order used here: `name`, `description`, `when_to_use`, `argument-hint`, `arguments`, `allowed-tools`, invocation flags, then `context`, `agent`, `model`, `effort`, `paths`, `hooks`.

## Fields

All optional in Claude Code; set `name` and `description` always (the spec and platform docs require them).

| Field                                                     | Type, default                                                                                                                                                                           | Set when                                                                             | Omit when                                                    |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------ |
| `name`                                                    | kebab string; default directory name. Spec: ≤64 chars, `a-z0-9-`, no leading, trailing, or consecutive hyphens, equals the directory. Platform: no `anthropic` or `claude`, no XML tags | Always                                                                               | Never                                                        |
| `description`                                             | string; default first body line. Spec and platform: ≤1,024 chars, no XML tags                                                                                                           | Always                                                                               | Never                                                        |
| `when_to_use`                                             | string; appended to `description` in the listing                                                                                                                                        | Trigger phrases would crowd the description                                          | Description already holds them                               |
| `argument-hint`                                           | string, e.g. `[issue-number]`                                                                                                                                                           | Skill takes arguments, for autocomplete                                              | No arguments                                                 |
| `arguments`                                               | space string or list; names for `$name`                                                                                                                                                 | Body reads named positional args                                                     | `$ARGUMENTS` suffices                                        |
| `allowed-tools`                                           | space or comma string, or list                                                                                                                                                          | Pre-approve known-safe tools for the invoking turn; it does not restrict other tools | No tool prompt to avoid                                      |
| `disallowed-tools`                                        | same shapes                                                                                                                                                                             | Remove tools while active                                                            | Never needed                                                 |
| `disable-model-invocation`                                | bool, false                                                                                                                                                                             | Side-effect or timing-sensitive Task                                                 | Claude should find it                                        |
| `user-invocable`                                          | bool, true                                                                                                                                                                              | Background-only                                                                      | User should run it                                           |
| `context`                                                 | `fork`                                                                                                                                                                                  | Task needing isolation, body self-contained                                          | Reference, Background-only, anything relying on conversation |
| `agent`                                                   | `Explore`, `Plan`, `general-purpose`, or a custom agent name; default general-purpose                                                                                                   | With `context: fork`                                                                 | No fork                                                      |
| `background`                                              | bool, true; only with `context: fork`                                                                                                                                                   | Fork should block the turn (`false`)                                                 | Default fits                                                 |
| `model`                                                   | `/model` value or `inherit`; this turn only                                                                                                                                             | Skill needs a different model                                                        | Session model fits                                           |
| `effort`                                                  | `low` `medium` `high` `xhigh` `max`                                                                                                                                                     | Skill needs a fixed effort                                                           | Session effort fits                                          |
| `paths`                                                   | globs, comma string or list                                                                                                                                                             | Reference that applies to certain files only                                         | Applies everywhere                                           |
| `hooks`                                                   | hook config, kept for the session                                                                                                                                                       | A rule must hold every time                                                          | Judgment guidance                                            |
| `shell`                                                   | `bash` (default) or `powershell`                                                                                                                                                        | `!` blocks need PowerShell                                                           | Default fits                                                 |
| `license`, `compatibility` (≤500 chars), `metadata` (map) | Spec fields; Claude Code does not act on them                                                                                                                                           | Distribution or your own tooling needs them                                          | Otherwise                                                    |

## Invocation matrix

| Flags                            | User `/name` | Claude auto-invokes | Description in context |
| -------------------------------- | ------------ | ------------------- | ---------------------- |
| none                             | yes          | yes                 | yes                    |
| `disable-model-invocation: true` | yes          | no                  | no                     |
| `user-invocable: false`          | no           | yes                 | yes                    |
| both                             | no           | no                  | no                     |

`user-invocable: false` only hides the skill from the `/` menu. `disable-model-invocation: true` also blocks preloading into subagents.

## Description

- Budget: `description` + `when_to_use` is cut at 1,536 chars per listing entry; keep `description` ≤1,024 to stay portable. All descriptions share ~1% of the context window; the least-invoked lose their text first. A model-disabled skill costs nothing in the listing.
- Write third person: what it does, then when to use it, key use case first ("Formats SQL files. Use when the user asks to format or lint SQL.").
- Include the words users say; keep it distinctive among 100+ skills. Vague text ("Helps with documents") fails.
- Side-effect Task without the flag: end with "Use only when the user explicitly asks to <action>."
- Not triggering → add natural keywords, ask "What skills are available?", run `/name`. Over-triggering → narrow it or set `disable-model-invocation: true`.

## Don'ts

- No misspelled or invented fields; no `---` below line 1.
- No XML tags or reserved words (`anthropic`, `claude`) in `name` or `description`.
- Do not treat `allowed-tools` as a restriction; use `disallowed-tools` to remove tools.
- Do not reuse frontmatter field names as `metadata` keys.
