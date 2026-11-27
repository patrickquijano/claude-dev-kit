# Evals

Cases for `setup-graphify`: the main path, the printed plan, the kept-file stops, and the missing-skill fallback. Test each on Haiku, Sonnet, and Opus.

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
| fresh-setup | "Set up graphify in this repo." (CLI present, nothing else done) | Installs skill and hooks, builds the graph, writes rules | Plan prints before the first write with no approval wait; no `--strict` or `--force`; `.gitignore` has the three-line block; `.claude/rules/graphify.md` added |
| rerun | "Set up graphify." (everything already done) | Changes nothing | Every step skipped; `Result: nothing-to-do`; no file changed |
| graph-skill-missing | "Set up graphify." (the third-party graph-building skill is unavailable) | Reports the graph as pending | Tells the user to run the third-party skill after a restart; `Graph: pending`; later steps still run |
| existing-ignore-line | "Set up graphify --yes." (`.gitignore` already has a `graphify-out/` line) | Keeps the line; graph stays local | The `graphify-out/` line is not deleted or edited; `Git ignore: kept local only`; the line is listed under `Open:` with the fix; no question asked |
| rerun-new-ignore-file | "Set up graphify." (everything done and `.gitignore` has the block, but a `.prettierignore` without `graphify-out/` now exists) | Appends only to that file | `append-ignores` runs; `.prettierignore` gains `graphify-out/`; `.gitignore` unchanged |
| rules-differ | "Set up graphify." (the rules file exists and differs) | Keeps the user's file | File untouched; `Rules: ... kept (differs)` |
| not-a-repo | "Set up graphify here." (not a git repository) | Skips the git steps | Works from the current directory; `Git hooks: skipped (not a git repo)`; no `.gitignore` is created (an existing one still gets the block), and an existing `.prettierignore` still gets `graphify-out/` |
| headless-no-ask | "Set up graphify." (run headless, no one to reply, no `--yes`) | Runs end to end: the skill asks nothing itself, so the no-ask stop never applies | No `Stopped: <step>: cannot interact`; the plan is printed and applied with no wait; the third-party graphify skill's folder prompt in step 5 is not this skill's ask and does not stop the run |
| no-approval-step | "Set up graphify in this repo." | Runs end to end with no approval step and no confirmation; side-effect steps run directly | No approval wait; each side-effect step runs directly after the decision questions |

## Running per model

Run every case on each model; a case passes only when all its `pass` lines hold. Record failures by id and model.
