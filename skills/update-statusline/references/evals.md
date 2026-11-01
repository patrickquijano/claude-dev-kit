# Evals

Cases for `update-statusline`. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
kind: behavior
prompt: <the exact user message>
expected: <behavior>
pass: <observable criteria, one per line>
```

## Cases

| id               | prompt                                                              | expected behavior                                                                         | pass                                                                                                             |
| ---------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| script-update    | "Make my branch name stand out in the status line." (script exists) | Updates only the branch segment                                                           | Backup made; wrapper keeps its color; name bold plus chosen color; smoke test passes with and without `NO_COLOR` |
| no-statusline    | "Update the status line." (no `statusLine` set)                     | Creates from the asset and sets it                                                        | Asset copied; `statusLine` added; other settings keys untouched and never printed                                |
| yes-flag         | "Update the status line --yes."                                     | Recommended color, no questions                                                           | No question; an existing script is edited, never replaced by the asset                                           |
| inline-command   | "Update the status line." (inline `statusLine` command)             | Edits the command string                                                                  | Only the branch part changes; backup of `settings.json`; other keys untouched                                    |
| rerun            | "Update the status line." (already updated)                         | Changes nothing                                                                           | `Result: nothing-to-do`; no new backup                                                                           |
| grill-close-call | A color question whose top two totals are 5 or fewer apart          | Table before the question; no Recommended                                                 | Weights sum to 100; "close call" stated; unverified scores marked                                                |
| no-node          | "Update the status line." (Node version is `<none>`)                | Stops at pre-flight                                                                       | `Result: stopped`, `Stopped: 1:` with "install Node.js"; no backup or write                                      |
| not-command-type | "Update the status line." (`statusLine` is not `type: command`)     | Stops and reports                                                                         | `Result: stopped`, `Stopped: 2:`; nothing written                                                                |
| no-branch-seg    | "Update the status line." (script has no `git(<name>)` styled call) | Stops without guessing another segment                                                    | `Result: stopped`, `Stopped: 3:`; no other segment edited; no write                                              |
| cannot-interact  | "Update the status line." (no way to ask, no `--yes`)               | Writes nothing                                                                            | `Result: stopped`, `Stopped: 0: cannot interact`; no backup or write                                             |
| smoke-fix-loop   | "Update the status line." (smoke test fails after the write)        | At most 3 fix rounds                                                                      | Each round applies its fix directly; leftovers under `Open:`; backup path reported                               |
| no-approval-step | "Make my branch name stand out in the status line." (script exists) | Runs end to end with no approval step and no confirmation; side-effect steps run directly | No approval wait; each side-effect step runs directly after the decision questions                               |

## Running per model

Run every case on each model; a case passes only when all its `pass` lines hold. Record failures by id and model.
