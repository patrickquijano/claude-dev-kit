# Evals

Cases for `setup-nextjs-app`. Test each on Haiku, Sonnet, and Opus.

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
| main-path | "Set up Next.js." (empty git repo) | Resolves, asks, plans, scaffolds, verifies | Versions cite a resolver source; grill tables before each question; plan prints before the first write; checks pass |
| yes-flag | "Set up Next.js --yes." | No question, Recommended taken | Assumptions under `Open:`; no existing user file overwritten |
| existing-kept | "Set up Next.js." (repo has `README.md` and a Next.js app) | Configure-only, user files kept | No scaffold; `README.md` untouched; a re-run changes nothing and ends `Result: nothing-to-do` |
| user-file-kept | "Set up Next.js --yes." (a user-edited tracked file collides with a generated one) | Keeps it; lists it | The file is not overwritten or deleted; the `collisions` row finds it after the scaffold and before `move-files`; it is listed under `Open:` with the change it would take; no question asked |
| spec-ask | "Set up Next.js." (no OpenAPI spec in the repo) | Asks for a spec path before the scaffold | A plain question for the spec path, no grill table; Orval and the MSW sample test use the given spec; no placeholder written |
| spec-placeholder-yes | "Set up Next.js --yes." (no OpenAPI spec in the repo) | Writes a minimal placeholder spec | No question asked; a minimal `openapi.yaml` is written; it is listed under `Open:` as a placeholder to replace; `orval` runs against it |
| red-flag-round | "Set up Next.js." (main path) | Red-flag pass, then fixes | Table with ID, cause, options, chosen, source; fixes print before applying; checks re-run |
| no-source | "Set up Next.js." (research sources unreachable) | Marks `unverified`, applies nothing silently | Each unsourced item listed under `Open:`; none applied |
| node-too-old | "Set up Next.js." (Node older than Next.js `engines.node`) | Stops at pre-flight | Both versions named; `Result: stopped`; nothing installed or written |
| npm-missing | "Set up Next.js." (`npm` not on PATH) | Stops at pre-flight | `Result: stopped`; `Stopped: 1: npm not found`; nothing installed or written |
| configure-only | "Set up Next.js." (repo already has a `next` dependency) | Skips the scaffold, configures only | `Mode: configure-only`; no `create-app` run; user files untouched; `Result: nothing-to-do` when nothing is missing |
| no-repo | "Set up Next.js." (not a git repository) | Stops at pre-flight | `Result: stopped`; `Stopped: 1: not a git repository`; nothing installed or written |
| cannot-interact | "Set up Next.js." (no way to ask, no `--yes`) | Writes nothing | `Result: stopped`, `Stopped: <step>: cannot interact`; nothing installed or written |
| grill-close-call | A decision question whose top two totals are 5 or fewer apart | Table before the question; no Recommended | Weights sum to 100; "close call" stated; unverified scores marked |
| grill-close-call-yes | "Set up Next.js --yes." (a decision question whose top two totals are 5 or fewer apart) | Takes the first catalog option; lists it | No Recommended is marked; the first option in the catalog is taken; it is listed under `Open:` |
| no-approval-step | "Set up Next.js." (empty git repo) | Runs end to end with no approval step and no confirmation; side-effect steps run directly | No approval wait; each side-effect step runs directly after the decision questions |

## Running per model

Run every case on each model; a case passes only when all its `pass` lines hold. Record failures by id and model.
