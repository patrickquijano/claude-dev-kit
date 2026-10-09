---
name: ship-spec-kit-bug
description: Take a bug from evidence to a reviewed GitLab merge request or GitHub pull request. Run cdk:fix-spec-kit-bug to assess, fix, and test it, then run cdk:ship-changes to branch, commit, open the MR or PR, and loop review and address rounds. An invalid verdict stops before shipping; an unverified fix asks first. Use only when the user explicitly asks to fix and ship a bug, or to take a bug all the way to a merge or pull request. Do not use on your own after finishing a task.
argument-hint: '<stack trace | error | URL | bug report>'
allowed-tools: Bash(git status *) Bash(git rev-parse *) Bash(git symbolic-ref *) Bash(git remote get-url *) Bash(glab api --paginate projects/:id/protected_branches) Bash(gh api repos/{owner}/{repo}/branches/{branch} --jq .protected)
---

# Ship Spec Kit Bug

Input: $ARGUMENTS

## Rules

- Follow `${CLAUDE_SKILL_DIR}/../ship-changes/orchestration.md`. Output blocks are handled by: Gate for fix-spec-kit-bug, Branch and Ship for the rest.
- GitLab or GitHub, like the ship chain: the protected-branch check uses the host row of `## Protected branch`, else its fallback list.
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `ship-spec-kit-bug`.

## Workflow

1. **Pre-flight.** `git status --porcelain` non-empty → AskUserQuestion: Cancel (Recommended, commit or stash first) | Continue (uncommitted changes ship with the fix). Cancel → `Result: cancelled`, `Stopped: Pre-flight: uncommitted changes`, report, stop.
2. **Fix.** Invoke the `cdk:fix-spec-kit-bug` skill via the Skill tool with `$ARGUMENTS`. Take `<slug>` from its `Bug:` line: the segment after `.specify/bugs/`, without the trailing `/`.
3. **Gate.** Read the Output block. `Verdict:` starts with `invalid` → `Stopped: Gate: invalid`, report, stop; no fix exists to ship. Any other verdict → check Fix and Test. `Fix: applied` and `Test: verified` → continue. Every other combination → AskUserQuestion: Stop (Recommended) | Commit + push + open MR or PR anyway; an unverified fix should not reach an MR or PR unasked. Stop → `Stopped: Gate: <Fix> / <Test>`, report, stop.
4. **Branch.** Current = `git rev-parse --abbrev-ref HEAD`. Protected per `${CLAUDE_SKILL_DIR}/../commit-changes/conventions.md` `## Protected branch` (host row, else fallback list) → skip, no ask; ship-changes switches off it with `fix <slug>`. Else not `fix/*` → invoke the `cdk:switch-branch` skill via the Skill tool with `fix <slug>`, no ask; its `Result: stopped | cancelled` → `Stopped: Branch: <its Stopped>`, report, stop.
5. **Ship.** Invoke the `cdk:ship-changes` skill via the Skill tool with `fix <slug>` as the branch hint, so cdk:switch-branch picks the `fix/` type. Its `Result: stopped | cancelled` → `Stopped: Ship: <its Stopped>`; `nothing-to-do` → `Result: nothing-to-do`. Report, end.

## Output

```text
Bug: .specify/bugs/<slug>/
Verdict: <verdict>; severity <level>
Fix: <status> (<passes> pass(es), <n> re-assess)
Test: <result>
Branch: <name> | none
Commits: <count> new (pushed | not pushed) | none
Excluded: <files> | none
MR: !<iid> <web_url> | PR: #<n> <url> | none
Rounds: <r> of 5 | none
Last review: gitlab: <n> inline, <m> general (<b> blocking, <p> praise) | github: <b> blocking, <s> suggestions | none
Merged: yes | no (<reason>) | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
