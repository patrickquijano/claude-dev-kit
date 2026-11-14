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

A behavior eval for a build: the skill asks the name, invocation, and complexity (create) questions, plus only a blocking question its Rules allow (unknown plugin dir, several jobs, a complexity follow-up), one per round (the approach question is implement-spec's), writes only the target path named in the printed spec summary, shows a diff before overwriting on update, and ends with the final report.

## Routing cases

| id | prompt | expected route | pass |
| --- | --- | --- | --- |
| route-skill | "Make something reusable so every migration I write follows our naming and rollback conventions." | Skill (reference or task), inline | Builds from the template; no outline; no fork |
| route-subagent | "I need a worker that sweeps all 400 files for deprecated API calls and returns a short list. Read-only, cheap model, keep the noise out of my chat." | Subagent | Gives an outline of at most 10 lines, writes no file, `Result: stopped`, `Stopped: 2: not a skill fit` |
| route-neither | "Every commit must run lint and be blocked if it fails." | Not a skill: a hook | Names a hook, builds no skill |
| route-hybrid | "A /audit-deps command I trigger by hand that runs isolated and reports back." | Skill with `context: fork` | Sets `disable-model-invocation: true` and `context: fork`, no `agent` |
| route-no-delegate | "A helper for iterating on release-note wording with me, back and forth." | Skill, inline (do not delegate) | No `context: fork` |
| route-user-wins | "I know a subagent might fit, but build it as a skill anyway: it scans logs and returns counts." | Skill, trade-off stated once | Builds the skill; mentions the trade-off once, no repeat |
| grill-close-call | A decision question whose top two totals are ≤5 apart | Table before the question; no Recommended | Table before the question; integer weights sum to 100; no Recommended; "close call" stated; unverified scores marked |

## Behavior cases

| id | prompt | expected behavior | pass |
| --- | --- | --- | --- |
| invocation-asked | "Improve my deploy skill so it is clearer." | Asks the invocation question even on an update | Shows the current value; Recommended option first; each option has a preview score matrix |
| name-proposed | "Build a skill that bumps package versions." | Proposes the name as 2–4 weighted options in create | 2–4 options; Recommended first with both top totals; each preview has the breakdown (criterion, weight, score, evidence); a candidate that fails a hard rule is dropped and listed with its rule |
| name-update-skip | "Improve my deploy skill." (valid name, no rename asked) | Asks no name question on an update | No name question; `Name: n/a`; the invocation question is still asked |
| skill-call-name-first | "Make a skill that runs the commit-changes skill first." | Invokes the other skill name-first with a plain-words fallback | Built skill says ``Invoke the `cdk:commit-changes` skill (fallback: run the commit-changes skill)``; `validate-skill` passes S1; never a `${CLAUDE_PLUGIN_ROOT}` path; no skill command on `Next:` |
| bypass-flags | "Build a skill that tidies logs." (user passes `--yes`) | Asks nothing, takes recommended choices | assumptions under `Open:`; built skill has `[--yes]` in `argument-hint` |
| no-plan-no-gate | "Build a skill that tidies logs." | Runs end to end with no approval step and no confirmation | No question whose only purpose is to approve a step; the spec summary is printed before writing and the write follows in the same turn; no build-skill question beyond invocation, name, and complexity (create) unless a blocking gap exists |
| safety-stop-kept | "Build a skill that deletes merged branches." | The built skill has no gate but has a safety stop before the irreversible step | Built skill has no approve-the-next-step question; it refuses (protected branch, unmerged work) with `Result: stopped` before deleting; its Rules bullet says `--yes` never skips the stop |
| dirty-tracked-edit | "Improve my deploy skill." (its SKILL.md has uncommitted changes, `--yes`) | Scores and edits the target | Applies the VERIFIED fixes through implement-spec; `Stopped: none` |
| spawn-name-first | "Make a skill that has a helper agent scan the repo first." | Names the fitting `cdk` subagent first, with a plain-words fallback and an inline fallback | Built skill names the fitting `cdk` subagent first with a plain-words fallback (role only when no plugin agent fits); the spawn line has a brief, an inline Return, and a fallback; `Next:` is plain words |
| cannot-interact | "Build a skill that tidies logs." (run as a subagent, no way to ask) | Asks nothing and writes nothing | No file written; `Result: stopped`, `Stopped: <step>: cannot interact` |
| allow-not-deducted | "Build a skill that writes changelog entries; let Claude invoke it." | The user picks Allow in the invocation question | No audit deduction for the missing flag; `Invocation: Allow` |
| audit-invoked | "Build a skill that summarizes a changelog." | Delegates the score to `cdk:audit-skill --score-only` | One `cdk:audit-skill --score-only <dir>` call per round (first score, then one rescore per fix round); fixes go through implement-spec; `validate-skill` re-run after; the report has an `Audit:` line |
| audit-yes-passthrough | "Build a skill that tidies logs." (with and without `--yes`) | Passes `--yes` to implement-spec only when the user gave it; score-only gets none | No `--yes` on the `cdk:audit-skill --score-only` call (it asks nothing); the `cdk:implement-spec` call carries it only when the user passed it |
| auto-invoke | A natural request for the action, no `/cdk:` command | Claude loads the skill on its own | The skill runs; the spec summary is printed, then implement-spec runs with no approval question |
| spec-handoff | "Build a skill that tidies logs." | Invokes `cdk:implement-spec` with goal, expectations, and instructions | One `cdk:implement-spec` call carrying the Spec brief; no planner or implementer subagent spawned by build-skill; the main thread makes no direct Write of the target |
| implement-no-git | "Build a skill that tidies logs." (User scope, target not in a git repo) | implement-spec runs without git | No `not a git repository` stop; the skill is written; `Result: done`; an implement-spec input stop (`needs input`, `no input`, or cancelled) is reported as `Result: stopped` with its reason |
| score-output | "Improve my deploy skill." (score-only audit lists deductions and negligible items) | Prints the score, every open item, and waived items | `Audit:`, `Open:` with `ID (lost pts) file:line: fix` for every item left, and `Waived:` with reasons; waived items never in `Open:` |
| extend-at-cap | "Improve my deploy skill." (still open after 3 rounds) | Asks the `Extend 3 more rounds` or `Stop` ask | Ask shown with a score table, Recommended first; `--yes` → Stop; Stop leaves the rest under `Open:` |
| memory-reuse | "Improve my deploy skill." (auto memory holds a matching `cdk-fix-skill-…` memory) | Reuses the remembered fix | The remembered fix is passed as an unverified hint beside the goal's After text, never as the After; after the rescore confirms, the memory is updated, not duplicated; nothing written under the skill dir |
| memory-path | "Build a skill that remembers the last cleaned folder." | The built skill keeps memory in the auto-memory dir | Built skill writes a memory file plus `MEMORY.md` pointer to the auto-memory dir taken from session context; nothing under its own skill directory; no path guessed |
| no-format-lint | "Build a skill that tidies logs." | No format or lint step in the built skill or the spec | Built skill has no formatter or linter step; the Spec brief tells implement-spec not to run either |
| rubric-improve | "Improve my deploy skill." (score-only audit returns below 90) | Turns deductions into implement-spec goals and rescores | `cdk:audit-skill --score-only` runs; implement-spec gets the fix IDs; `validate-skill` re-run, then rescored; at most 3 rounds |
| no-trigger-hook | "Add a hook that formats files after each edit." | build-skill does not load | The skill is not invoked; no spec summary printed |
| no-trigger-agent | "Write a subagent that reviews my diffs." | build-skill does not load | The skill is not invoked; no file written |

## Running per model

1. Spawn one read-only subagent per model (Haiku, Sonnet, Opus), all in parallel, each with that `model` (fallback: switch with `/model` and run each model in turn).
2. Give it the target's SKILL.md and one case's prompt as data; ask for the route (routing case) or a pass/fail per `pass` line (behavior case), one line each.
3. Compare the route with `expected`; for a behavior case, re-check one returned pass/fail line against the target's SKILL.md text before recording; record pass or fail per model in a table (case × model).
4. A case that fails on one model → tighten the target skill's wording, not the case; re-run only that model. 3 rounds at most, then report what is left as unverified.
