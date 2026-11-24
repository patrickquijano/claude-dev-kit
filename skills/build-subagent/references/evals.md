# Evals

Cases for `build-subagent`: fit routing and the stop, audit, and rename behaviors. Test each on Haiku, Sonnet, and Opus.

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

| id | prompt | expected route | pass |
| --- | --- | --- | --- |
| route-subagent | "Build a subagent that sweeps the repo for deprecated API calls and returns a short list. Read-only." | Subagent | Passes the Preflight; enters the interview; no write before the Brief |
| route-skill | "Build a subagent that walks me through our release steps and asks me at each stage." | Not a subagent: a skill | Names a skill once, no question, then proceeds with the interview |
| route-hook | "Build a subagent that blocks every commit whose lint fails." | Not a subagent: a hook | Names a hook once, no Stop \| Build anyway question, then proceeds |
| route-main-thread | "Build a subagent that makes a quick one-line fix to this file while we talk it through." | Not a subagent: main thread | Names the main thread once, no Stop \| Build anyway question, then proceeds |
| route-several | "Build a subagent that reviews code and also writes the tests and updates the changelog." (hybrid: routing, then Several-jobs behavior) | Several jobs | Asks Split \| Narrow \| Skill \| Stop with each job's evidence; builds no multi-job agent |
| route-not-subagent | "Build a skill that lints Markdown files." | Does not trigger; build-skill handles it | `build-subagent` is not loaded; no interview batch is asked |
| grill-close-call | A decision question whose top two totals are ≤5 apart | Table before the question; no Recommended | Table before the question; integer weights sum to 100; no Recommended; "close call" stated; unverified scores marked |

## Behavior cases

| id | prompt | expected behavior | pass |
| --- | --- | --- | --- |
| cannot-interact | "Build a subagent that lists TODOs." (run as a subagent, no way to ask) | Asks nothing and writes nothing | No file written; `Result: stopped`, `Stopped: 1: cannot interact` |
| action-name | "Build a subagent called `review-code`." | Scores `review-code` beside its actor form | `review-code` is a scored option; `code-reviewer` is Recommended with the higher total; previews hold the breakdown; the file stem matches the confirmed `name` |
| name-proposed | "Build a subagent that lists TODOs." (no name given) | Proposes 2–4 weighted names | 2–4 candidates from different sources; Recommended first with both top totals; previews hold the breakdown |
| improve-nothing | "Improve `agents/<name>.md`." (check passes, report-only audit has no Fail) | No edit | `Result: nothing-to-do`; `Audit:` line shows 0 fail |
| audit-invoked | "Build a subagent that lists TODOs." | Delegates the audit to `cdk:audit-subagent --report-only` | One `cdk:audit-subagent --report-only <file>` call per round (first audit, then one re-audit per fix round); fixes go through `cdk:implement-spec`; `check-agent` re-run after; the report has an `Audit:` line |
| audit-yes-passthrough | "Build a subagent that lists TODOs." (with and without `--yes`) | Passes `--yes` to `cdk:implement-spec` only when the user gave it; report-only gets none | No `--yes` on the `cdk:audit-subagent --report-only` call (it asks nothing); the `cdk:implement-spec` call carries it only when the user passed it |
| dependency-missing-stops | "Build a subagent that lists TODOs." (`cdk:audit-subagent` is missing) | Stops, never audits inline | `Result: stopped`, `Stopped: <step>: dependency cdk:audit-subagent missing`; no inline audit |
| no-plan-no-gate | "Build a subagent that lists TODOs." | Runs end to end with no approval step and no confirmation | No build-subagent question after the interview batches; the Brief is printed, then the `cdk:implement-spec` call follows in the same turn; no "Proceed?" prompt |
| writer-named-files | "Build a subagent that applies the fixes the parent lists." | The built writer edits only files the parent named | Built body says it edits only the files named in its brief and refuses and reports any other file; no question to the parent |
| auto-invoke | A natural request for the action, no `/cdk:` command | Claude loads the skill on its own | The skill runs; the Brief is printed and the `cdk:implement-spec` call follows with no approval question from build-subagent |
| spec-handoff | "Build a subagent that lists TODOs." | Invokes `cdk:implement-spec` with the Spec brief | One `cdk:implement-spec` call carrying the Spec brief; no planner or implementer spawned by build-subagent; the main thread makes no direct Write of the target |
| implement-no-git | "Build a subagent that lists TODOs." (target outside a git repo) | cdk:implement-spec runs without git | No `not a git repository` stop; the file is written; a cdk:implement-spec input stop (`needs input`, `no input`, or cancelled) is reported as `Result: stopped` with its reason |
| implement-needs-input-stops | "Build a subagent that lists TODOs." (`cdk:implement-spec` ends `Stopped: <step>: needs input`) | Stops, never writes inline | `Result: stopped`, `Stopped: <step>: needs input`; no inline write fallback |
| implement-outside-scope-stops | "Build a subagent that lists TODOs." (`cdk:implement-spec` ends `Stopped: <step>: write outside scope`) | Stops, never writes inline | `Result: stopped`, `Stopped: <step>: write outside scope`; no inline write fallback |
| implement-cancelled-stops | "Build a subagent that lists TODOs." (`cdk:implement-spec` ends `Result: cancelled`) | Stops, keeping cdk:implement-spec's reason | `Result: stopped`, `Stopped: <step>: user cancelled`; no inline write fallback |
| audit-output | "Improve `agents/<name>.md`." (report-only audit lists Fail rows) | Prints the counts and every Fail row left | `Audit: <p> pass, <f> fail, <n> not checked (report-only, <n> rounds)` and `Open:` with `<check ID> file:line: fix` for every Fail row left |
| extend-at-cap | "Improve `agents/<name>.md`." (a Fail row remains after 3 rounds) | Asks the `Extend 3 more rounds` or `Stop` ask | Ask shown with the remaining Fail rows, Recommended first; `--yes` → Stop; Stop leaves the rest under `Open:` |
| no-fail-stops | "Improve `agents/<name>.md`." (report-only audit returns no Fail) | Runs no fix round | No fix-round `cdk:implement-spec` call; no `Extend 3 more rounds` ask; `Open: none` |
| fail-left-stops | "Improve `agents/<name>.md`." (a Fail remains after the rounds, `Stop` chosen) | Stops, asks first, never reports done | Ask `Extend 3 more rounds` or `Stop` shown; `Result: stopped`, `Stopped: 9: audit fail`; `Next:` points to `/cdk:audit-subagent`; the full audit report printed |
| batch-plugin-dir | "Improve every subagent in ./my-plugin." (one subagent ends with a Fail left) | One run per `agents/**/*.md`; the others continue | Separate Output block per subagent and a totals line; the failing subagent ends `Result: stopped`; no other subagent stops; nothing fixed across subagents |
| long-description-rewrite-ask | "Improve `agents/<name>.md`." (its `description` is 450 chars) | Shows the before/after rewrite and asks | `Apply` or `Keep` asked before the spec is built; `--yes` keeps it unchanged and lists it under `Open:` |
| memory-reuse | "Improve `agents/<name>.md`." (auto memory holds a matching `cdk-fix-subagent-…` memory) | Reuses the remembered fix | The remembered fix is passed as an unverified hint beside the goal's proposed fix, never as the fix itself; after the re-audit confirms, the memory is updated, not duplicated; nothing written under the skill dir |
| no-format-lint | "Build a subagent that lists TODOs." | No formatter or linter runs | The Spec brief says not to run either; the report lists none |

## Running per model

1. For each model (Haiku, Sonnet, Opus), start a fresh run: in Claude Code switch with `/model`, or hand the default agent the model name.
2. Give it `SKILL.md`, `interview.md`, `verify.md`, and one case's prompt as data; ask for the predicted route or behavior, the predicted Output lines it would print, and a one-line reason only. A criterion that needs a real run (a file written, a spawn) is judged from those predicted lines.
3. Compare with `expected`; record pass or fail per model in a table (case × model).
4. A case that fails on one model → tighten the skill wording, not the case; re-run only that model. 3 rounds at most, then report what is left as unverified.
