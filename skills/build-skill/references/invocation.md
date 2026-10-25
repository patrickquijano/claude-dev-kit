# Invocation

The weighted question that sets a skill's invocation flags. Ask it every run (create, update, improve); the user's choice wins.

## Contents

- Options · Criteria · Scoring · Question

## Options

Pick the set by the skill's kind. Each option states facts from the Invocation matrix in the rules reference (a bundled snapshot; re-checking its Sources is optional).

| Kind            | Option          | Flags                            | Who can invoke  | Description in context  | Preload into subagents |
| --------------- | --------------- | -------------------------------- | --------------- | ----------------------- | ---------------------- |
| Task            | Disable         | `disable-model-invocation: true` | User only       | No                      | Blocked                |
| Task            | Allow           | none                             | User and Claude | Yes                     | Allowed                |
| Reference       | Allow           | none                             | User and Claude | Yes                     | Allowed                |
| Reference       | Allow + `paths` | `paths: <globs>`                 | User and Claude | Yes, for matching files | Allowed                |
| Background-only | Background-only | `user-invocable: false`          | Claude only     | Yes                     | Allowed                |
| Background-only | Allow           | none                             | User and Claude | Yes                     | Allowed                |

## Criteria

Weights sum to 100.

| Criterion                                         | Weight |
| ------------------------------------------------- | ------ |
| Side effects or irreversibility                   | 35     |
| Needs auto-discovery during other work            | 25     |
| Timing or user control                            | 15     |
| Subagent preload or chaining needed               | 15     |
| Context budget (the description is always listed) | 10     |

## Scoring

- Score each option 0, 1, or 2 per criterion: 2 fits the criterion, 0 fights it.
- Cite evidence for every score: the target's `file:line` (for example `allowed-tools` has Bash, or a step writes a file or pushes) or a bundled fact (the Invocation matrix row plus its Sources URL). No evidence → score 1 and say so.
- Weighted total = Σ(weight × score / 2). The highest total is the Recommended option.
- A tie goes to Disable for a task with side effects, otherwise Allow.
- Facts come from the bundled snapshot, labeled as such. Re-checking them on the web is optional, never required.

## Question

- One AskUserQuestion with the Recommended option first and a one-line reason.
- Each option's `preview` holds its score breakdown: criterion, weight, score, evidence.
- Update and improve show the current value in the question.
- Record the choice and its flags; the rubric's F5 scores against it. Without AskUserQuestion, ask in plain text with the same table.
