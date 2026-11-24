# Evals

Cases for `release-plugin`: the happy path, the flags, and a mid-chain stop. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
prompt: <the exact user message and repo state>
expected: <behavior>
pass: <observable criteria>
```

## Cases

| id | prompt | expected | pass |
| --- | --- | --- | --- |
| happy-path | `/release-plugin` (one `feat` commit pending) | Runs steps 1-17 | Steps 3-5 invoke `cdk:update-rules`, `cdk:update-readme`, `cdk:update-changelog`; step 7 runs the four checks; no planner or implementer spawn; `Merged: yes`; `Branches deleted: <head>`; `Open: none`; `Result: done` |
| step-stops | `/release-plugin` (the commit step ends `Result: stopped`) | Stops on the first non-done step | `Stopped: 8: ...`; no push, PR, or tag; `Steps:` lists 1-7 |
| checks-stop | `/release-plugin` (`npm test` fails at the checks step) | Stops at step 7 | `Stopped: 7: test failed` with the exact error line; no commit, push, or PR; `Steps:` lists 1-6 |
| pr-checks-stop | `/release-plugin` (`gh pr checks <url> --watch --fail-fast` exits non-zero) | Stops before the merge | `Stopped: 11: PR checks failed`; the merge skill not invoked; `Merged: no` |
| nothing-pending | `/release-plugin` (clean tree, no commits ahead) | Stops at the pre-flight | `Result: nothing-to-do`; no skill step run |
| bad-version-arg | `/release-plugin 0.0.1` (current is higher) | Rejects the override | `Stopped: 1: ...`; plugin.json unchanged |
| non-github-origin | `/release-plugin` (`origin` is a GitLab remote) | Stops at the pre-flight | `Stopped: 1: origin is not a GitHub remote`; no skill invoked, no edit |
| doc-skill-unattended | `/release-plugin` (the README skill would ask a length question) | No question; recommended option taken | No question asked; the skill takes its recommended option, listed under `Open:` |
| rules-skill-stops | `/release-plugin` (`cdk:update-rules` returns `Result: stopped`) | Stops at step 3 | `Stopped: 3: ...`; no commit |
| no-pause | `/release-plugin` (happy path) | Runs to the last step without a prompt | The only user inputs are decision answers; no turn ends between steps; `Steps:` lists 1-17 |
| yes-bypass | `/release-plugin --yes` (happy path) | Asks nothing | No question; step 13 deletes only the release head branch; `Workflow: success`; `Result: done` |
| workflow-fails | `/release-plugin` (the release run for the tag fails) | Stops at step 16 | `Stopped: 16: ...`; `Workflow: failure`; `Next:` names recovering the release in plain words |
| squash-branch-delete | `/release-plugin` (PR squash-merged; the local branch tip sha equals `<merged head sha>`; git calls the branch not fully merged) | Force-deletes only the release head branch | Release check returned `head-is-merge: yes` and `head-sha-equal: yes` first; `git branch -D '<head>'` runs once; `cdk:delete-branches` is not invoked; the remote branch is deleted by the host (`Branch: deleted (host setting)`) or by one `git push origin --delete '<head>'`; `Branches deleted:` lists only that branch |
| version-mismatch-stops | `/release-plugin` (README status version differs from `plugin.json` after the merge) | Stops at the release check | `Stopped: 12: ...`; no branch delete, tag, or tag push |
| protected-branch-switch | `/release-plugin` (run from `main` with pending changes) | Moves off the protected branch | Step 2 runs review-code-changes, then invokes switch-branch; on an unprotected branch only the switch part is skipped; the push is step 9 |
| pre-switch-review | `/release-plugin` (from `main`; the review finds one issue) | Review fixes it before the switch | `review-code-changes` runs before `switch-branch`; switch only if still protected |
| review-stops | `/release-plugin` (the review hits its cap) | Stops at step 2 | `Stopped: 2: ...`; `Steps:` lists 1; no switch, commit, or push |
| direct-doc-skills | `/release-plugin` (happy path) | Steps 3-5 invoke the skills in order | The three skills invoked in order with `--yes`; step 6 edits only `version` |
| no-plan-no-gate | `/release-plugin` (happy path) | No approval step, no confirmation | No printed plan, no approval wait; push, merge, branch delete, tag, and tag push run directly |
| namespaced-calls | `/release-plugin` (happy path) | Plugin parts called by namespace | Every skill invoked as `cdk:<name>` |
| nested-next-none | `/release-plugin` (step 10's `cdk:open-github-pull-request` ends `Next: none`, `Result: done`, after background subagents) | Goes on to step 11 in the same turn | No text-only message after step 10's Output; `Step 10/17: … → next 11` is in the same message as the step 11 `gh pr checks` call |
| no-pr-review | `/release-plugin` (happy path) | No PR review, address, or open-items step | Neither `cdk:review-github-pull-request`, `cdk:address-github-pull-request-review`, nor `cdk:implement-spec` is invoked; step 11 checks and merges right after step 10 |
| no-auto-invoke | "We should ship a new release soon." (no command) | Claude does not load the skill | The skill does not run |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
