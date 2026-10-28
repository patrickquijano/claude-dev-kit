# Evals

Write at least 3 evals for each skill you build, in the target skill's `references/evals.md`, linked from its SKILL.md `## Files`; include routing cases when the skill makes a fit decision. Test each on Haiku, Sonnet, and Opus.

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

A behavior eval for a build: the skill asks at most one blocking question, writes only the plan-approved target path, shows a diff before overwriting on update, and ends with the final report.

## Routing cases

| id                | prompt                                                                                                                                                | expected route                            | pass                                                                                                                 |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| route-skill       | "Make something reusable so every migration I write follows our naming and rollback conventions."                                                     | Skill (reference or task), inline         | Builds from the template; no outline; no fork                                                                        |
| route-subagent    | "I need a worker that sweeps all 400 files for deprecated API calls and returns a short list. Read-only, cheap model, keep the noise out of my chat." | Subagent                                  | Gives an outline of at most 10 lines, writes no file, stops                                                          |
| route-neither     | "Every commit must run lint and be blocked if it fails."                                                                                              | Not a skill: a hook                       | Names a hook, builds no skill                                                                                        |
| route-hybrid      | "A /audit-deps command I trigger by hand that runs isolated and reports back."                                                                        | Skill with `context: fork`                | Sets `disable-model-invocation: true` and `context: fork`, no `agent`                                                |
| route-no-delegate | "A helper for iterating on release-note wording with me, back and forth."                                                                             | Skill, inline (do not delegate)           | No `context: fork`                                                                                                   |
| route-user-wins   | "I know a subagent might fit, but build it as a skill anyway: it scans logs and returns counts."                                                      | Skill, trade-off stated once              | Builds the skill; mentions the trade-off once, no repeat                                                             |
| grill-close-call  | A decision question whose top two totals are ≤5 apart                                                                                                 | Table before the question; no Recommended | Table before the question; integer weights sum to 100; no Recommended; "close call" stated; unverified scores marked |

## Behavior cases

| id                  | prompt                                                                                        | expected behavior                                              | pass                                                                                                                                                                                                                                        |
| ------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| invocation-asked    | "Improve my deploy skill so it is clearer."                                                   | Asks the invocation question even on an update                 | Shows the current value; Recommended option first; each option has a preview score matrix                                                                                                                                                   |
| name-proposed       | "Build a skill that bumps package versions."                                                  | Proposes the name as 2–4 weighted options in create            | 2–4 options; Recommended first with both top totals; each preview has the breakdown (criterion, weight, score, evidence); a candidate that fails a hard rule is dropped and listed with its rule                                            |
| name-update-skip    | "Improve my deploy skill." (valid name, no rename asked)                                      | Asks no name question on an update                             | No name question; `Name: n/a`; the invocation question is still asked                                                                                                                                                                       |
| skill-call-prose    | "Make a skill that runs the lint skill first."                                                | Invokes the other skill with a plain-language line             | Built skill says "run the lint skill"; `validate-skill` passes S1; never a `${CLAUDE_PLUGIN_ROOT}` path; no skill command on `Next:`                                                                                                        |
| bypass-flags        | "Build a skill that tidies logs." (user passes `--yes`)                                       | Asks nothing, skips plan mode, takes recommended choices       | `Plan mode: skipped (--yes)`; assumptions under `Open:`; built skill has `[--yes] [--no-plan]` in `argument-hint`; destructive steps still asked                                                                                            |
| score-loop          | "Build a skill that summarizes a changelog, then keep fixing it."                             | Scores each round and fixes inline until 100/100 or a stall    | Prints an open-items table (ID, cause, options, chosen) per round; enters plan mode with the open-items table before any Edit; rescores after every fix round, and the final Score comes from a rescore; at a stall asks; at most 10 rounds |
| rescore-always      | "Improve my deploy skill." (the scorer returns 96, then the fix round ends)                   | Rescores after the fix round                                   | The reported `Score:` is the last rescore, not an estimate; every criterion is re-scored from the current files, none assumed or carried forward                                                                                            |
| plan-declined       | "Improve my deploy skill." (the user declines plan mode)                                      | Stops and writes nothing                                       | Output shows `Plan mode: declined`, `Result: stopped`, `Stopped: 2: plan mode declined`; no file is written and no fix round runs                                                                                                           |
| plan-rejected-3x    | "Build a skill that tidies commit messages." (the user rejects the plan 3 times)              | Revises and calls `ExitPlanMode` again each time, then cancels | Writes no file; `Result: cancelled`, `Stopped: 4: plan rejected`                                                                                                                                                                            |
| spawn-by-role       | "Make a skill that has a helper agent scan the repo first."                                   | Describes the helper by role, with an inline fallback          | Built skill describes the helper by role first, naming a `cdk` subagent only as a fallback; the spawn line has a brief, an inline Return, and a fallback; `Next:` is plain words                                                            |
| cannot-interact     | "Build a skill that tidies logs." (run as a subagent, no way to ask)                          | Asks nothing and writes nothing                                | No file written; `Result: stopped`, `Stopped: <step>: cannot interact`                                                                                                                                                                      |
| allow-not-deducted  | "Build a skill that writes changelog entries; let Claude invoke it."                          | The user picks Allow in the invocation question                | No F5/F13/F2 deduction for the missing flag; `Invocation: Allow`                                                                                                                                                                            |
| fix-round-plan-mode | "Build a skill that summarizes a changelog." (validate-skill fails; the fix plan is rejected) | Enters plan mode before the step 5 fix                         | Step 5 fix round calls `EnterPlanMode` before any Edit; a rejected plan applies nothing                                                                                                                                                     |
| auto-invoke         | A natural request for the action, no `/cdk:` command                                          | Claude loads the skill on its own                              | The skill runs; its existing confirm or plan approval still precedes any write or push                                                                                                                                                      |

## Running per model

1. For each model (Haiku, Sonnet, Opus), start a fresh run: in Claude Code switch with `/model`, or hand the default agent the model name.
2. Give it SKILL.md, `skill-vs-subagent.md`, and one case's prompt as data; ask for the route and the one-line reason only.
3. Compare the route with `expected`; record pass or fail per model in a table (case × model).
4. A case that fails on one model → tighten the wording of the fit rubric, not the case; re-run only that model. 3 rounds at most, then report what is left as unverified.
