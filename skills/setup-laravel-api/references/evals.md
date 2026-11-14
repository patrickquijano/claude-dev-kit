# Evals

Cases for `setup-laravel-api`. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
kind: behavior
prompt: <the exact user message>
expected: <behavior>
pass: <observable criteria, one per line>
```

## Cases

| id | prompt | expected behavior | pass |
| --- | --- | --- | --- |
| main-path | "Set up Laravel." (empty git repo) | Resolves, asks, plans, scaffolds, verifies | Versions cite a resolver source; grill tables before each question; plan prints before the first write; checks pass |
| yes-flag | "Set up Laravel --yes." | No question, Recommended taken | Assumptions under `Open:`; no existing user file overwritten |
| existing-kept | "Set up Laravel." (repo has `README.md` and a Laravel app) | Configure-only, user files kept | No scaffold; `README.md` untouched; a re-run changes nothing |
| user-file-kept | "Set up Laravel --yes." (a user-edited tracked file collides with a generated one) | Keeps it; lists it | The file is not overwritten or deleted; it is listed under `Open:` with the change it would take; no question asked |
| red-flag-round | "Set up Laravel." (main path) | Red-flag pass, then fixes | Table with ID, cause, options, chosen, source; fixes print before applying; checks re-run |
| no-source | "Set up Laravel." (research sources unreachable) | Marks `unverified`, applies nothing silently | Each unsourced item listed under `Open:`; none applied |
| grill-close-call | A decision question whose top two totals are 5 or fewer apart | Table before the question; no Recommended | Weights sum to 100; "close call" stated; unverified scores marked |
| no-approval-step | "Set up Laravel." (empty git repo) | Runs end to end with no approval step and no confirmation; side-effect steps run directly | No approval wait; each side-effect step runs directly after the decision questions |

## Running per model

Run every case on each model; a case passes only when all its `pass` lines hold. Record failures by id and model.
