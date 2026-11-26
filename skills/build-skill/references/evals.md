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

Each built skill's evals include at least one should-trigger and one should-not-trigger prompt.

A behavior eval for a build: the skill asks the name and complexity (create) questions, plus only a blocking question its Rules allow (unknown plugin dir, several jobs, a complexity follow-up), one per round (the approach question is cdk:implement-spec's), writes only the target path named in the printed spec summary, shows a diff before overwriting on update, and ends with the final report.

## Routing cases

| id | prompt | expected route | pass |
| --- | --- | --- | --- |
| route-skill | "Make something reusable so every migration I write follows our naming and rollback conventions." | Skill (reference or task), inline | Builds from the template; no outline; no fork |
| route-subagent | "I need a worker that sweeps all 400 files for deprecated API calls and returns a short list. Read-only, cheap model, keep the noise out of my chat." | Subagent | Gives an outline of at most 10 lines, writes no file, `Result: stopped`, `Stopped: 2: not a skill fit` |
| route-neither | "Every commit must run lint and be blocked if it fails." | Not a skill: a hook | Names a hook, builds no skill |
| route-hybrid | "A /audit-deps command I trigger by hand that runs isolated and reports back." | Skill with `context: fork` | Sets `context: fork`, no `agent`, no invocation flag |
| route-no-delegate | "A helper for iterating on release-note wording with me, back and forth." | Skill, inline (do not delegate) | No `context: fork` |
| route-user-wins | "I know a subagent might fit, but build it as a skill anyway: it scans logs and returns counts." | Skill, trade-off stated once | Builds the skill; mentions the trade-off once, no repeat |
| grill-close-call | A decision question whose top two totals are ≤5 apart | Table before the question; no Recommended | Table before the question; integer weights sum to 100; no Recommended; "close call" stated; unverified scores marked |

## Behavior cases

| id | prompt | expected behavior | pass |
| --- | --- | --- | --- |
| no-invocation-question | "Build a skill that pushes tags." | Asks no invocation question | No invocation question; no `disable-model-invocation` or `user-invocable` in the built skill; no `Invocation:` line in the report; the description ends with "Use only when the user explicitly asks to push tags." |
| name-proposed | "Build a skill that bumps package versions." | Proposes the name as 2–4 weighted options in create | 2–4 options; Recommended first with both top totals; each preview has the breakdown (criterion, weight, score, evidence); a candidate that fails a hard rule is dropped and listed with its rule |
| name-update-skip | "Improve my deploy skill." (valid name, no rename asked) | Asks no name question on an update | No name question; `Name: n/a` |
| skill-call-name-first | "Make a skill that runs the cdk:commit-changes skill first." | Invokes the other skill name-first with a plain-words fallback | Built skill says ``Invoke the `cdk:commit-changes` skill (fallback: run the commit-changes skill)``; `validate-skill` passes S1; never a `${CLAUDE_PLUGIN_ROOT}` path; no skill command on `Next:` |
| bypass-flags | "Build a skill that tidies logs." (user passes `--yes`) | Asks nothing, takes recommended choices | assumptions under `Open:`; built skill has `[--yes]` in `argument-hint` |
| no-plan-no-gate | "Build a skill that tidies logs." | Runs end to end with no approval step and no confirmation | No question whose only purpose is to approve a step; the spec summary is printed before writing and the write follows in the same turn; no cdk:build-skill question beyond name and complexity (create) unless a blocking gap exists |
| safety-stop-kept | "Build a skill that deletes merged branches." | The built skill has no gate but has a safety stop before the irreversible step | Built skill has no approve-the-next-step question; it refuses (protected branch, unmerged work) with `Result: stopped` before deleting; its Rules bullet says `--yes` never skips the stop |
| dirty-tracked-edit | "Improve my deploy skill." (its SKILL.md has uncommitted changes, `--yes`) | Scores and edits the target | Applies the VERIFIED fixes through cdk:implement-spec; `Stopped: none` |
| spawn-name-first | "Make a skill that has a helper agent scan the repo first." | Names the fitting `cdk` subagent first, with a plain-words fallback and an inline fallback | Built skill names the fitting `cdk` subagent first with a plain-words fallback (role only when no plugin agent fits); the spawn line has a brief, an inline Return, and a fallback; `Next:` is plain words |
| cannot-interact | "Build a skill that tidies logs." (run as a subagent, no way to ask) | Asks nothing and writes nothing | No file written; `Result: stopped`, `Stopped: <step>: cannot interact` |
| audit-invoked | "Build a skill that summarizes a changelog." | Delegates the audit to `cdk:audit-skill --report-only` | One `cdk:audit-skill --report-only <dir>` call per round (first audit, then one re-audit per fix round); fixes go through cdk:implement-spec; `validate-skill` re-run after; the report has an `Audit:` line |
| audit-yes-passthrough | "Build a skill that tidies logs." (with and without `--yes`) | Passes `--yes` to cdk:implement-spec only when the user gave it; report-only gets none | No `--yes` on the `cdk:audit-skill --report-only` call (it asks nothing); the `cdk:implement-spec` call carries it only when the user passed it |
| auto-invoke | A natural request for the action, no `/cdk:` command | Claude loads the skill on its own | The skill runs; the spec summary is printed, then cdk:implement-spec runs with no approval question |
| spec-handoff | "Build a skill that tidies logs." | Invokes `cdk:implement-spec` with goal, expectations, and instructions | One `cdk:implement-spec` call carrying the Spec brief; no planner or implementer subagent spawned by cdk:build-skill; the main thread makes no direct Write of the target |
| implement-no-git | "Build a skill that tidies logs." (User scope, target not in a git repo) | cdk:implement-spec runs without git | No `not a git repository` stop; the skill is written; `Result: done`; an cdk:implement-spec input stop (`needs input`, `no input`, `cannot interact`, or cancelled) is reported as `Result: stopped` with its reason |
| implement-needs-input-stops | "Build a skill that tidies logs." (`cdk:implement-spec` ends `Stopped: <step>: needs input`) | Stops, never writes inline | `Result: stopped`, `Stopped: <step>: needs input`; no inline write fallback |
| implement-outside-scope-stops | "Build a skill that tidies logs." (`cdk:implement-spec` ends `Stopped: <step>: write outside scope`) | Stops, never writes inline | `Result: stopped`, `Stopped: <step>: write outside scope`; no inline write fallback |
| implement-cancelled-stops | "Build a skill that tidies logs." (`cdk:implement-spec` ends `Result: cancelled`) | Stops, keeping cdk:implement-spec's reason | `Result: stopped`, `Stopped: <step>: user cancelled`; no inline write fallback |
| audit-output | "Improve my deploy skill." (report-only audit lists Fail rows) | Prints the counts and every Fail row left | `Audit: <p> pass, <f> fail, <n> not checked (report-only, <n> rounds)` and `Open:` with `<check ID> file:line: fix` for every Fail row left |
| extend-at-cap | "Improve my deploy skill." (a Fail row with a fix outside `scripts/` remains after 3 rounds) | Asks the `Extend 3 more rounds` or `Stop` ask | Ask shown with the remaining Fail rows, Recommended first; `--yes` → Stop; Stop leaves the rest under `Open:` |
| memory-reuse | "Improve my deploy skill." (auto memory holds a matching `cdk-fix-skill-…` memory) | Reuses the remembered fix | The remembered fix is passed as an unverified hint beside the goal's proposed fix, never as the fix itself; after the re-audit confirms, the memory is updated, not duplicated; nothing written under the skill dir |
| memory-path | "Build a skill that remembers the last cleaned folder." | The built skill keeps memory in the auto-memory dir | Built skill writes a memory file plus `MEMORY.md` pointer to the auto-memory dir taken from session context; nothing under its own skill directory; no path guessed |
| no-format-lint | "Build a skill that tidies logs." | No format or lint step in the built skill or the spec | Built skill has no formatter or linter step; the Spec brief tells cdk:implement-spec not to run either |
| audit-improve | "Improve my deploy skill." (report-only audit returns Fail rows) | Turns Fail rows into cdk:implement-spec goals and re-audits | `cdk:audit-skill --report-only` runs; cdk:implement-spec gets the check IDs; `validate-skill` re-run, then re-audited; the loop ends once no Fail row with a fix outside `scripts/` is left; at most 3 rounds |
| no-fail-stops | "Improve my deploy skill." (report-only audit returns no Fail) | Runs no fix round | No fix-round cdk:implement-spec call; no `Extend 3 more rounds` ask; `Open: none` |
| scripts-fail-open | "Improve my deploy skill." (report-only audit returns only a `scripts/` Fail) | Runs no fix round for it | No cdk:implement-spec call for the script; no `Extend 3 more rounds` ask; the Fail is listed under `Open:` |
| scope-asked | "Build a skill that tidies logs." (no scope named) | Asks the scope (user, project, plugin) | One scope question before the spec; no scope guessed |
| scope-unknown-yes-stops | "Build a skill that tidies logs." (`--yes`, no scope named) | Stops, never guesses | `Result: stopped`, `Stopped: 1: no scope`; nothing written |
| long-description-rewrite-ask | "Improve my deploy skill." (description plus `when_to_use` is 450 chars) | Shows the before/after rewrite and asks | `Apply` or `Keep` asked before the spec is built |
| long-description-yes-keeps | "Improve my deploy skill." (`--yes`, description plus `when_to_use` is 450 chars) | Keeps it unchanged | Description unchanged; listed under `Open:` |
| skills-ref-optional | "Build a skill that tidies logs." (no `skills-ref` on PATH) | Records the skip and continues | `skills-ref: skipped`; no block; `validate-skill` still runs |
| gerund-name-ok | "Build a skill that processes PDFs." (candidate `processing-pdfs`) | Accepts the gerund name | No hard-rule drop; no actor warning from `validate-skill` |
| synced-folder-rejected | "Improve my skill." (it holds `references/Synced/`) | Flags the reserved folder in any capitalization | `reserved-folder` error from `validate-skill` |
| batch-plugin-dir | "Improve every skill in ./my-plugin." (one skill ends with a Fail left) | One run per `skills/*/SKILL.md`; the others continue | Separate Output block per skill and a totals line; the failing skill ends `Result: stopped`; no other skill stops; nothing fixed across skills |
| dependency-missing-stops | "Build a skill that tidies logs." (`cdk:implement-spec` is missing) | Stops, never writes inline | `Result: stopped`, `Stopped: <step>: dependency cdk:implement-spec missing`; no inline write |
| fail-left-stops | "Improve my deploy skill." (a Fail remains after the rounds, `Stop` chosen) | Stops, asks first, never reports done | Ask `Extend 3 more rounds` or `Stop` shown; `Result: stopped`, `Stopped: 8: audit fail`; evals listed as untested; the full audit report printed |
| name-no-namespace | "Build a skill named cdk:tidy-logs." | Drops the namespaced name | The candidate is dropped with the namespace hard rule; frontmatter `name` has no `cdk:`; skill references in the built skill read `cdk:<name>` |
| no-trigger-hook | "Add a hook that formats files after each edit." | cdk:build-skill does not load | The skill is not invoked; no spec summary printed |
| no-trigger-agent | "Write a subagent that reviews my diffs." | cdk:build-skill does not load | The skill is not invoked; no file written |

## Running per model

0. Run one model without the skill as a baseline, then write minimal instructions, then iterate.
1. Spawn one read-only subagent per model (Haiku, Sonnet, Opus), all in parallel, each with that `model` (fallback: switch with `/model` and run each model in turn).
2. Give it the target's SKILL.md and one case's prompt as data; ask for the route (routing case) or a pass/fail per `pass` line (behavior case), one line each.
3. Compare the route with `expected`; for a behavior case, re-check one returned pass/fail line against the target's SKILL.md text before recording; record pass or fail per model in a table (case × model).
4. A case that fails on one model → tighten the target skill's wording, not the case; re-run only that model. 3 rounds at most, then report what is left as unverified.
