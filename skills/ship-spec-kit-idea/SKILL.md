---
name: ship-spec-kit-idea
description: Take an idea from assessment to a reviewed GitLab merge request. Run cdk:assess-spec-kit-idea, on a go verdict run cdk:run-spec-kit with its handoff summary, then run cdk:ship-merge-request to branch, commit, open the MR, and loop review and address rounds. Kill or unresolved needs-clarification stops before shipping. Use only when the user explicitly asks to assess and ship an idea, or to take a Spec Kit idea all the way to a merge request. Do not use on your own after finishing a task.
argument-hint: '<idea text | URL | ticket | codebase pointer>'
allowed-tools: Bash(git status *) Bash(git rev-parse *) Bash(git symbolic-ref *) Bash(git remote get-url *) Bash(glab api --paginate projects/:id/protected_branches)
disable-model-invocation: true
---

# Ship Spec Kit Idea

Input: $ARGUMENTS

## Rules

- Follow `${CLAUDE_SKILL_DIR}/../ship-merge-request/orchestration.md`. Output blocks are handled by: Gate for assess-spec-kit-idea, Build for run-spec-kit, Branch and Ship for the rest.
- GitLab only, like the ship chain: the protected-branch check uses only the gitlab and fallback rows of `## Protected branch`.
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `ship-spec-kit-idea`.

## Workflow

1. **Pre-flight.** `git status --porcelain` non-empty → AskUserQuestion: Cancel (Recommended, commit or stash first) | Continue (uncommitted changes ship with the feature). Cancel → `Result: cancelled`, `Stopped: Pre-flight: uncommitted changes`, report, stop.
2. **Assess.** Invoke `cdk:assess-spec-kit-idea` with `$ARGUMENTS handoff=no`, so it stops at go and this skill runs run-spec-kit itself. Take `<slug>` from its `Assessment:` line: the segment after `.specify/assessments/`, without the trailing `/`.
3. **Gate.** Read the `Verdict:` line. `kill` → `Stopped: Gate: kill`. `needs-clarification` → `Stopped: Gate: needs-clarification, <re-runs> re-run(s)`. `unknown` (decision unreadable) → `Stopped: Gate: unknown verdict`. `go` with `Result: stopped` (no handoff section) → `Stopped: Gate: assess <its Stopped>`. All four: report, stop; no implementation exists to ship. `go` with `Next: handoff ready` → step 4.
4. **Build.** Read the section whose heading starts with `## If go` in `.specify/assessments/<slug>/decision.md`, up to the next `##` heading. Invoke `cdk:run-spec-kit` with that section body verbatim. Its `Result: cancelled`, or `Stopped:` at any step other than step 10 (Implement, converge, address) → `Stopped: Build: run-spec-kit <its Stopped>`, report, stop. Not converged or open items, including run-spec-kit stopping after 5 rounds → continue; the MR review loop surfaces them. `Addressed:` `<c> of them CRITICAL` with c > 0, or any item listed under `Open:` starts with `CRITICAL:` → AskUserQuestion: Stop (Recommended) | Commit + push + open MR anyway; unresolved CRITICAL findings should not reach an MR unasked. Stop → `Result: stopped`, `Stopped: Build: CRITICAL findings open`, report, stop.
5. **Branch.** Current = `git rev-parse --abbrev-ref HEAD`. Protected per `${CLAUDE_SKILL_DIR}/../commit-changes/conventions.md` `## Protected branch` (gitlab row, else fallback list) → skip, no ask; ship-merge-request switches off it with `feat <slug>`. Else not `feat/*` → AskUserQuestion: New branch for this feature (Recommended) | Keep `<current>`. When current is a Spec Kit branch (`001-<name>`), the New option description warns: later `speckit-*` commands for this feature find its directory from that branch name. New → invoke `cdk:switch-branch` with `feat <slug>`; its `Result: stopped | cancelled` → `Stopped: Branch: <its Stopped>`, report, stop.
6. **Ship.** Invoke `cdk:ship-merge-request` with `feat <slug>` as the branch hint, so cdk:switch-branch picks the `feat/` type. Its `Result: stopped | cancelled` → `Stopped: Ship: <its Stopped>`; `nothing-to-do` → `Result: nothing-to-do`. Report, end.

## Output

```text
Assessment: .specify/assessments/<slug>/ (<verdict>)
Feature: specs/<feature> | none
Implement: <rounds> round(s), converged | not converged (<k> tasks left) | skipped
Open: <one line per open item from run-spec-kit> | none
Branch: <name> | none
Commits: <count> pushed | none
MR: !<iid> <web_url> | none
Rounds: <r> of 5 | none
Last review: <n> inline, <m> general (<b> blocking, <p> praise) | none
Merged: yes | no (<reason>) | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
