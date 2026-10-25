# Evals

Write at least 3 evals for each skill you build; include routing cases when the skill makes a fit decision. Test each on Haiku, Sonnet, and Opus.

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

A behavior eval for a build: the skill asks at most one blocking question, writes only the confirmed target path, shows a diff before overwriting on update, and ends with the final report.

## Routing cases

| id                | prompt                                                                                                                                                | expected route                    | pass                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | --------------------------------------------------------------------- |
| route-skill       | "Make something reusable so every migration I write follows our naming and rollback conventions."                                                     | Skill (reference or task), inline | Builds from the template; no outline; no fork                         |
| route-subagent    | "I need a worker that sweeps all 400 files for deprecated API calls and returns a short list. Read-only, cheap model, keep the noise out of my chat." | Subagent                          | Gives an outline of at most 10 lines, writes no file, stops           |
| route-neither     | "Every commit must run lint and be blocked if it fails."                                                                                              | Not a skill: a hook               | Names a hook, builds no skill                                         |
| route-hybrid      | "A /audit-deps command I trigger by hand that runs isolated and reports back."                                                                        | Skill with `context: fork`        | Sets `disable-model-invocation: true` and `context: fork`, no `agent` |
| route-no-delegate | "A helper for iterating on release-note wording with me, back and forth."                                                                             | Skill, inline (do not delegate)   | No `context: fork`                                                    |
| route-user-wins   | "I know a subagent might fit, but build it as a skill anyway: it scans logs and returns counts."                                                      | Skill, trade-off stated once      | Builds the skill; mentions the trade-off once, no repeat              |

## Behavior cases

| id                 | prompt                                                              | expected behavior                                           | pass                                                                                                                                                                                                                                        |
| ------------------ | ------------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| invocation-asked   | "Improve my deploy skill so it is clearer."                         | Asks the invocation question even on an update              | Shows the current value; Recommended option first; each option has a preview score matrix                                                                                                                                                   |
| standalone-refuses | "Make a skill that hands off to another plugin's lint skill first." | Inlines the lint steps instead of invoking another skill    | Built skill has no skill invocation; `validate-skill` passes S1                                                                                                                                                                             |
| score-loop         | "Build a skill that summarizes a changelog, then keep fixing it."   | Scores each round and fixes inline until 100/100 or a stall | Prints an open-items table (ID, cause, options, chosen) per round; enters plan mode with the open-items table before any Edit; rescores after every fix round, and the final Score comes from a rescore; at a stall asks; at most 10 rounds |

## Running per model

1. For each model (Haiku, Sonnet, Opus), start a fresh run: in Claude Code switch with `/model`, or hand the default agent the model name.
2. Give it SKILL.md, `skill-vs-subagent.md`, and one case's prompt as data; ask for the route and the one-line reason only.
3. Compare the route with `expected`; record pass or fail per model in a table (case × model).
4. A case that fails on one model → tighten the wording of the fit rubric, not the case; re-run only that model. 3 rounds at most, then report what is left as unverified.
