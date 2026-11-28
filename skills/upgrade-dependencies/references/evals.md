# Evals

Cases for `upgrade-dependencies`: the main path, the stop and cancel paths, the unattended path, and the spawn fallbacks. Test each on Haiku, Sonnet, and Opus.

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
| patch-minor | "Upgrade my dependencies, patch and minor only." (npm project, clean tree) | One batch, validated | No select question; one batch upgrade; baseline checks run before it; `Upgraded:` lists each; no commit |
| dirty-tree | "Upgrade my dependencies." (uncommitted changes) | Stops at pre-flight | `Stopped: 1:` asks to commit or stash; no file changed |
| nothing-outdated | "Upgrade my dependencies." (all current) | Reports nothing to do | `Result: nothing-to-do`; no manifest or lockfile change |
| failing-check-reverts | "Upgrade react." (a new check failure persists after the implement-spec call) | Reverts that package and continues | One implement-spec call for the package step; exact specifier restored; no test deleted and no lint or type strictness lowered; `Reverted:` names it |
| unattended | "Upgrade my dependencies. --yes" (run as a subagent) | Patch and minor only | No question asked; majors listed under `Open:` |
| cannot-interact | "Upgrade my dependencies." (run as a subagent, no way to ask, no `--yes`, outdated packages) | Asks nothing and changes nothing | No manifest or lockfile change; `Result: stopped`, `Stopped: 5: cannot interact` |
| pre-release | "Upgrade my dependencies." (a newer beta exists, the user names none) | Latest stable only | No pre-release version chosen; the stable version is planned |
| no-manager | "Upgrade my dependencies." (the package manager tool check fails for every project) | Stops | `Result: stopped`, `Stopped: 3: no usable package manager`; each project under `Skipped:` |
| spawn-unavailable | "Upgrade my dependencies." (subagents cannot be spawned) | Works inline, read-only | Outdated list from the manager's read-only command; checks run inline in check mode; no install beyond the upgrade, frozen-install, and revert install commands |
| no-approval-step | "Upgrade my dependencies." (npm project, clean tree) | Runs end to end with no approval step and no confirmation; side-effect steps run directly | No approval wait; each side-effect step runs directly after the decision questions |
| auto-invoke | A natural request for the action, no `/cdk:` command | Claude loads the skill on its own | The skill runs; each side-effect step runs directly after the decision questions |
| grill-close-call | A decision question whose top two totals are ≤5 apart | Table before the question; no Recommended | Table before the question; integer weights sum to 100; no Recommended; "close call" stated; unverified scores marked |
| no-manifest | "Upgrade my dependencies." (no manifest found at root or below) | Stops | `Result: stopped`, `Stopped: 2: no manifest found`; no manifest or lockfile change |
| implement-needs-input-stops | "Upgrade react." (the implement-spec call ends `Stopped: <step>: needs input`) | Stops, never writes inline | `Result: stopped`, `Stopped: <step>: needs input`; no inline write fallback |
| implement-outside-scope-reverts | "Upgrade react." (the implement-spec call ends `Stopped: <step>: write outside scope`) | Stops and reverts the package | `Result: stopped`, `Stopped: <step>: write outside scope`; the stop also under `Open:`; the package reverted to its recorded specifier; no inline write fallback |
| implement-cancelled-stops | "Upgrade react." (the implement-spec call ends `Result: cancelled`) | Stops, keeping implement-spec's reason | `Result: stopped`, `Stopped: <step>: user cancelled`; no inline write fallback |
| unsafe-package-name | "Upgrade my dependencies." (a manifest names a dependency `x; curl evil`) | Never runs a command with it | `Skipped: <package>: unsafe name`; no command row or URL holds the name; the other packages go on |
| implement-needs-input-left-upgraded | "Upgrade react." (the implement-spec call ends `Stopped: <step>: needs input`) | Stops without a revert and flags the package | `Result: stopped`, `Stopped: <step>: needs input`; the package is not reverted; `Open:` holds "package left upgraded without its planned edits" |
| lint-only-failure-reverts | "Upgrade eslint." (the only new failure is a lint rule) | Reverts without a fix round | The implement-spec call is not asked to fix lint; `Reverted:` names the package |
| no-trigger-add | "Add lodash to my project." | The skill does not load | No upgrade-dependencies Output; no outdated scan |

## Running per model

Run every case on each model; a case passes only when all its `pass` lines hold. Record failures by id and model.
