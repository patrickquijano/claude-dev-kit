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

| id                | prompt                                                                                                                                  | expected route              | pass                                                                                      |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------- |
| route-subagent    | "Build a subagent that sweeps the repo for deprecated API calls and returns a short list. Read-only."                                   | Subagent                    | Passes Gate 1 Preflight; enters the interview; no write before the Brief                  |
| route-skill       | "Build a subagent that walks me through our release steps and asks me at each stage."                                                   | Not a subagent: a skill     | Asks Stop (Recommended) \| Build anyway; writes nothing on Stop                           |
| route-hook        | "Build a subagent that blocks every commit whose lint fails."                                                                           | Not a subagent: a hook      | Names a hook; asks Stop (Recommended) \| Build anyway                                     |
| route-main-thread | "Build a subagent that makes a quick one-line fix to this file while we talk it through."                                               | Not a subagent: main thread | Names the main thread; asks Stop (Recommended) \| Build anyway                            |
| route-several     | "Build a subagent that reviews code and also writes the tests and updates the changelog." (hybrid: routing, then Several-jobs behavior) | Several jobs                | Asks Split \| Narrow \| Skill \| Stop with each job's evidence; builds no multi-job agent |

## Behavior cases

| id                 | prompt                                                                         | expected behavior                        | pass                                                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------ | ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| cannot-interact    | "Build a subagent that lists TODOs." (run as a subagent, no way to ask)        | Asks nothing and writes nothing          | No file written; `Result: stopped`, `Stopped: 1: cannot interact`                                                                                         |
| action-name        | "Build a subagent called `review-code`."                                       | Asks Rename \| Keep, recommending Rename | Recommends `code-reviewer`; the file stem matches the confirmed `name`                                                                                    |
| improve-nothing    | "Improve `agents/rubric-scorer.md`." (check passes, score 100)                 | Baseline only; no edit                   | `Result: nothing-to-do`; no plan mode entered; `Plan mode: skipped (<reason>)`                                                                            |
| fix-to-100         | "Fix `agents/task-worker.md`." (check passes, score 97)                        | Fixes until 100 or the stop rule         | Rescores after each fix pass; `Score: 100/100 (pass)`, or a deduction that cannot be fixed without silencing or invention is in `Open:`; at most 3 rounds |
| scorer-unavailable | "Fix `agents/task-worker.md`." (`cdk:rubric-scorer` cannot be spawned)         | Scores inline against `rubric.md`        | No second spawn; the Score table comes from `rubric.md`; `Score:` is a number                                                                             |
| plan-rejected      | "Build a subagent that lists TODOs." (the user rejects the plan and says stop) | Cancels and writes nothing               | No agent file, no backup; `Result: cancelled`                                                                                                             |

## Running per model

1. For each model (Haiku, Sonnet, Opus), start a fresh run: in Claude Code switch with `/model`, or hand the default agent the model name.
2. Give it `SKILL.md`, `interview.md`, `score.md`, `rubric.md`, and one case's prompt as data; ask for the predicted route or behavior, the predicted Output lines it would print, and a one-line reason only. A criterion that needs a real run (a file written, a spawn) is judged from those predicted lines.
3. Compare with `expected`; record pass or fail per model in a table (case × model).
4. A case that fails on one model → tighten the skill wording, not the case; re-run only that model. 3 rounds at most, then report what is left as unverified.
