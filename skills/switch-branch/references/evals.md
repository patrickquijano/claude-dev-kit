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

| id                 | prompt                                                                | expected behavior                      | pass                                                                                      |
| ------------------ | --------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------- |
| move-and-push      | "Move my changes to a new branch." (dirty tree on `main`, origin set) | Names, confirms once, switches, pushes | One question listing unstage, switch, and push; nothing changed before it; `Result: done` |
| switch-only        | "Switch to a new branch for this." (the user picks Switch only)       | Switches without pushing               | No `push` run; `Branch: <name> → not pushed`; changes and commits carried                 |
| name-taken         | "Put this on a new branch." (the derived name exists on origin)       | Suffixes the name through the script   | `free-name` returns `-2`; the confirm shows the suffixed name                             |
| stop-at-confirm    | "Branch this off." (the user picks Stop)                              | Cancels with no change                 | `Result: cancelled`; no unstage, switch, or push                                          |
| nothing-to-do      | "Move to a new branch." (clean tree, no unique commits, no input)     | Does nothing                           | `Result: nothing-to-do`; no analyzer spawn                                                |
| unattended         | "Create a branch for these edits." (run as a subagent, no way to ask) | Switches, never pushes                 | `Branch: <name> → not pushed`; `Result: done`; no question asked                          |
| analyzer-failure   | "Branch these changes off." (the analyzer spawn is unavailable)       | Derives the name inline                | Name comes from `Type and description`; no second spawn attempt beyond the cap            |
| input-full-name    | "Switch to feat/add-login." (dirty tree)                              | Uses the name verbatim, no analyzer    | Confirm shows `feat/add-login`; reason `from input`; no analyzer spawn                    |
| input-normalized   | "Switch to Feature/Add_Login." (dirty tree)                           | Normalizes the name                    | Name is `feat/add-login`; the reason shows the normalization; no analyzer spawn           |
| input-typed        | "Branch off to fix the null crash on save." (dirty tree)              | Names inline with a `fix/` type        | Name starts `fix/`, verb-first description; no analyzer spawn                             |
| input-untyped      | "Branch off for the login page." (dirty tree)                         | Input description, diffs set type      | Analyzer gets `input=<text>`; reason `from input + changes (type)`                        |
| input-clean-tree   | "Switch to feat/add-login." (clean tree, no unique commits)           | Proceeds on the input                  | Not `nothing-to-do`; name `feat/add-login`; confirm shown                                 |
| input-alias        | "Switch to bugfix: login crash." (dirty tree)                         | Maps the alias to a fix/ name          | Name starts `fix/`, not `bugfix/`; verb-first description; no analyzer spawn              |
| input-unknown-type | "Switch to wip/foo." (dirty tree)                                     | Whole input becomes a description      | No `wip/` name is made; the description is the input, the type is set by diffs            |
| input-unclear-yes  | "Branch this off for it." (dirty tree, run with --yes)                | Stops without asking                   | `Result: stopped`; no question asked; no unstage, switch, or push                         |
| auto-invoke        | A natural request for the action, no `/cdk:` command                  | Claude loads the skill on its own      | The skill runs; its existing confirm or plan approval still precedes any write or push    |

## Running per model

Run every case on each model; a case passes only when all its `pass` lines hold. Record failures by id and model.
