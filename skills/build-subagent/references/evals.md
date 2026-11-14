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
| improve-nothing | "Improve `agents/<name>.md`." (check passes, audit returns ACCEPTED with no open item) | No edit | `Result: nothing-to-do`; `Audit:` line shows ACCEPTED |
| audit-invoked | "Build a subagent that lists TODOs." | Scores through `cdk:audit-subagent --score-only` | One `cdk:audit-subagent --score-only <file>` call after `check-agent`; fixes go through implement-spec; `check-agent` re-run after; the report has `Audit:` (score), `Open:`, and `Waived:` lines |
| audit-yes-passthrough | "Build a subagent that lists TODOs." (with and without `--yes`) | Passes `--yes` to implement-spec only when the user gave it | The `cdk:audit-subagent --score-only` call carries no `--yes`; the `cdk:implement-spec` call carries it only when the user passed it |
| audit-fallback | "Fix `agents/<name>.md`." (the `cdk:audit-subagent` skill cannot be invoked) | Runs the audit-subagent skill in plain words | No rubric scoring inline in this skill; every open item goes to `Open:` |
| no-plan-no-gate | "Build a subagent that lists TODOs." | Runs end to end with no approval step and no confirmation | No build-subagent question after the interview batches; the Brief is printed, then the `cdk:implement-spec` call follows in the same turn; no "Proceed?" prompt |
| writer-named-files | "Build a subagent that applies the fixes the parent lists." | The built writer edits only files the parent named | Built body says it edits only the files named in its brief and refuses and reports any other file; no question to the parent |
| auto-invoke | A natural request for the action, no `/cdk:` command | Claude loads the skill on its own | The skill runs; the Brief is printed and the `cdk:implement-spec` call follows with no approval question from build-subagent |
| spec-handoff | "Build a subagent that lists TODOs." | Invokes `cdk:implement-spec` with the Spec brief | One `cdk:implement-spec` call carrying the Spec brief; no planner or implementer spawned by build-subagent; the main thread makes no direct Write of the target |
| implement-no-git | "Build a subagent that lists TODOs." (target outside a git repo) | implement-spec runs without git | No `not a git repository` stop; the file is written; an implement-spec input stop (`needs input`, `no input`, or cancelled) is reported as `Result: stopped` with its reason |
| score-output | "Improve `agents/<name>.md`." (score-only lists deductions and negligible items) | Prints the score, every open item, and waived items | `Audit:`, `Open:` with `ID (lost pts) file:line: fix` for every item left, `Waived:` with reasons; waived items never in `Open:` |
| extend-at-cap | "Improve `agents/<name>.md`." (still REJECTED with a VERIFIED fix open after 3 rounds) | Asks the `Extend 3 more rounds` or `Stop` ask | Ask shown with a score table, Recommended first; `--yes` → Stop; Stop leaves the rest under `Open:` |
| accepted-stops | "Improve `agents/<name>.md`." (score-only audit returns ACCEPTED with only non-blocking VERIFIED fixes) | Runs no fix round | No fix-round implement-spec call; no `Extend 3 more rounds` ask; each non-blocking VERIFIED fix is listed under `Open:` |
| accepted-blocking-fix | "Improve `agents/<name>.md`." (score-only audit returns ACCEPTED with one blocking and one non-blocking VERIFIED fix) | Runs one fix round for the blocking fix only | One `cdk:implement-spec` call whose only goal is the blocking fix; no `Extend 3 more rounds` ask; the non-blocking fix is listed under `Open:` |
| memory-reuse | "Improve `agents/<name>.md`." (auto memory holds a matching `cdk-fix-subagent-…` memory) | Reuses the remembered fix | The remembered fix is passed as an unverified hint beside the goal's After text, never as the After; the memory is updated, not duplicated; nothing written under the skill dir |
| no-format-lint | "Build a subagent that lists TODOs." | No formatter or linter runs | The Spec brief says not to run either; the report lists none |

## Running per model

1. For each model (Haiku, Sonnet, Opus), start a fresh run: in Claude Code switch with `/model`, or hand the default agent the model name.
2. Give it `SKILL.md`, `interview.md`, `verify.md`, and one case's prompt as data; ask for the predicted route or behavior, the predicted Output lines it would print, and a one-line reason only. A criterion that needs a real run (a file written, a spawn) is judged from those predicted lines.
3. Compare with `expected`; record pass or fail per model in a table (case × model).
4. A case that fails on one model → tighten the skill wording, not the case; re-run only that model. 3 rounds at most, then report what is left as unverified.
