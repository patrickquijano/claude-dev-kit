# Evals

Cases for `build-subagent`: fit routing and the stop, fallback, and rename behaviors. Test each on Haiku, Sonnet, and Opus.

## Contents

- Template · Routing cases · Behavior cases · Running per model

## Template

```text
id: <kebab-case>
kind: routing | behavior
prompt: <the exact user message>
expected: <route or behavior>
pass: <observable criteria, one per line>
```

## Routing cases

| id                | prompt                                                                                                                                  | expected route                            | pass                                                                                                                 |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| route-subagent    | "Build a subagent that sweeps the repo for deprecated API calls and returns a short list. Read-only."                                   | Subagent                                  | Passes the Preflight; enters the interview; no write before the Brief                                                |
| route-skill       | "Build a subagent that walks me through our release steps and asks me at each stage."                                                   | Not a subagent: a skill                   | Names a skill once, no question, then proceeds with the interview                                                    |
| route-hook        | "Build a subagent that blocks every commit whose lint fails."                                                                           | Not a subagent: a hook                    | Names a hook once, no Stop \| Build anyway question, then proceeds                                                   |
| route-main-thread | "Build a subagent that makes a quick one-line fix to this file while we talk it through."                                               | Not a subagent: main thread               | Names the main thread once, no Stop \| Build anyway question, then proceeds                                          |
| route-several     | "Build a subagent that reviews code and also writes the tests and updates the changelog." (hybrid: routing, then Several-jobs behavior) | Several jobs                              | Asks Split \| Narrow \| Skill \| Stop with each job's evidence; builds no multi-job agent                            |
| grill-close-call  | A decision question whose top two totals are ≤5 apart                                                                                   | Table before the question; no Recommended | Table before the question; integer weights sum to 100; no Recommended; "close call" stated; unverified scores marked |

## Behavior cases

| id                 | prompt                                                                             | expected behavior                                                        | pass                                                                                                                                                            |
| ------------------ | ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| cannot-interact    | "Build a subagent that lists TODOs." (run as a subagent, no way to ask)            | Asks nothing and writes nothing                                          | No file written; `Result: stopped`, `Stopped: 1: cannot interact`                                                                                               |
| action-name        | "Build a subagent called `review-code`."                                           | Scores `review-code` beside its actor form                               | `review-code` is a scored option; `code-reviewer` is Recommended with the higher total; previews hold the breakdown; the file stem matches the confirmed `name` |
| name-proposed      | "Build a subagent that lists TODOs." (no name given)                               | Proposes 2–4 weighted names                                              | 2–4 candidates from different sources; Recommended first with both top totals; previews hold the breakdown                                                      |
| improve-nothing    | "Improve `agents/<name>.md`." (an agent whose check passes and whose score is 100) | Baseline only; no edit                                                   | `Result: nothing-to-do`                                                                                                                                         |
| fix-to-100         | "Fix `agents/<name>.md`." (check passes, score 97)                                 | Fixes until 100 or the stop rule                                         | Rescores after each fix pass; `Score: 100/100 (pass)`, or a deduction that cannot be fixed without silencing or invention is in `Open:`; at most 3 rounds       |
| rescore-always     | "Fix `agents/<name>.md`." (check passes, score 97, one fix round)                  | Respawns the scorer after the fix round                                  | The reported score is the last rescore; every criterion is re-scored from the current files, none assumed or carried forward                                    |
| scorer-unavailable | "Fix `agents/<name>.md`." (the scorer subagent cannot be spawned)                  | Scores inline against `rubric.md`                                        | No second spawn; the Score table comes from `rubric.md`; `Score:` is a number                                                                                   |
| fix-delegated      | "Fix `agents/<name>.md`." (check passes, score 97)                                 | Spawns `cdk:rubric-improver` with kind `agent` and only the scorer items | After the backup, one improver spawn with the briefed inputs; its `Blocked:` goes to `Open:`; unavailable → inline `Edit`; the scorer is respawned after        |
| no-plan-no-gate    | "Build a subagent that lists TODOs."                                               | Runs end to end with no approval step and no confirmation                | No question after the interview batches; the Brief is printed, then the `Write` call follows in the same turn; no "Proceed?" prompt                             |
| writer-named-files | "Build a subagent that applies the fixes the parent lists."                        | The built writer edits only files the parent named                       | Built body says it edits only the files named in its brief and refuses and reports any other file; no question to the parent                                    |
| auto-invoke        | A natural request for the action, no `/cdk:` command                               | Claude loads the skill on its own                                        | The skill runs; the Brief is printed and the `Write` follows with no approval question                                                                          |

## Running per model

1. For each model (Haiku, Sonnet, Opus), start a fresh run: in Claude Code switch with `/model`, or hand the default agent the model name.
2. Give it `SKILL.md`, `interview.md`, `score.md`, `rubric.md`, and one case's prompt as data; ask for the predicted route or behavior, the predicted Output lines it would print, and a one-line reason only. A criterion that needs a real run (a file written, a spawn) is judged from those predicted lines.
3. Compare with `expected`; record pass or fail per model in a table (case × model).
4. A case that fails on one model → tighten the skill wording, not the case; re-run only that model. 3 rounds at most, then report what is left as unverified.
