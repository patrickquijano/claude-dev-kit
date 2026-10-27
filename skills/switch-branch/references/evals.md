# Evals

Cases for `switch-branch`: naming, the single confirmation, and the stop behaviors. Test each on Haiku, Sonnet, and Opus.

## Contents

- Template · Cases · Running per model

## Template

```text
id: <kebab-case>
prompt: <the exact user message>
expected: <behavior>
pass: <observable criteria, one per line>
```

## Cases

| id               | prompt                                                                | expected behavior                      | pass                                                                                      |
| ---------------- | --------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------- |
| move-and-push    | "Move my changes to a new branch." (dirty tree on `main`, origin set) | Names, confirms once, switches, pushes | One question listing unstage, switch, and push; nothing changed before it; `Result: done` |
| switch-only      | "Switch to a new branch for this." (the user picks Switch only)       | Switches without pushing               | No `push` run; `Branch: <name> → not pushed`; changes and commits carried                 |
| name-taken       | "Put this on a new branch." (the derived name exists on origin)       | Suffixes the name through the script   | `free-name` returns `-2`; the confirm shows the suffixed name                             |
| stop-at-confirm  | "Branch this off." (the user picks Stop)                              | Cancels with no change                 | `Result: cancelled`; no unstage, switch, or push                                          |
| nothing-to-do    | "Move to a new branch." (clean tree, no unique commits, no input)     | Does nothing                           | `Result: nothing-to-do`; no analyzer spawn                                                |
| unattended       | "Create a branch for these edits." (run as a subagent, no way to ask) | Switches, never pushes                 | `Branch: <name> → not pushed`; `Result: done`; no question asked                          |
| analyzer-failure | "Branch these changes off." (the analyzer spawn is unavailable)       | Derives the name inline                | Name comes from `Type and description`; no second spawn attempt beyond the cap            |
| auto-invoke      | A natural request for the action, no `/cdk:` command                  | Claude loads the skill on its own      | The skill runs; its existing confirm or plan approval still precedes any write or push    |

## Running per model

Run every case on each model; a case passes only when all its `pass` lines hold. Record failures by id and model.
