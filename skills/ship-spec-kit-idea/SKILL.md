---
name: ship-spec-kit-idea
description: Take an idea from assessment to a reviewed GitLab merge request or GitHub pull request. Run cdk:assess-spec-kit-idea, on a go verdict run cdk:run-spec-kit with its handoff summary, then run cdk:ship-changes to branch, commit, open the MR or PR, and loop review and address rounds. Kill or unresolved needs-clarification stops before shipping. Use only when the user explicitly asks to assess and ship an idea, or to take a Spec Kit idea all the way to a merge or pull request. Do not use on your own after finishing a task.
argument-hint: '<idea text | URL | ticket | codebase pointer>'
allowed-tools: Bash(git status *) Bash(git rev-parse *) Bash(git symbolic-ref *) Bash(git remote get-url *) Bash(glab api --paginate projects/:id/protected_branches) Bash(gh api repos/{owner}/{repo}/branches/{branch} --jq .protected)
---

# Ship Spec Kit Idea

Input: $ARGUMENTS

## Rules

- Follow `${CLAUDE_SKILL_DIR}/../ship-changes/orchestration.md`. Output blocks are handled by: Gate for assess-spec-kit-idea, Build for run-spec-kit, Branch and Ship for the rest.
- GitLab or GitHub, like the ship chain: the protected-branch check uses the host row of `## Protected branch`, else its fallback list.
- Final step: follow `${CLAUDE_SKILL_DIR}/../build-skill/resolve-findings.md` (scope: ask-only; sources: `Open:` items, `Implement: not converged`, `Commits: not pushed`, `Excluded:`, `Merged: no (<reason>)`, `Last review:`, open `Resolution:` lines of the chained skills).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `ship-spec-kit-idea`.

## Workflow

1. **Pre-flight.** `git status --porcelain` non-empty → AskUserQuestion: Cancel (Recommended, commit or stash first) | Continue (uncommitted changes ship with the feature). Cancel → `Result: cancelled`, `Stopped: Pre-flight: uncommitted changes`, report, stop.
2. **Assess.** Invoke the `cdk:assess-spec-kit-idea` skill via the Skill tool with `$ARGUMENTS handoff=no`, so it stops at go and this skill runs run-spec-kit itself. Take `<slug>` from its `Assessment:` line: the segment after `.specify/assessments/`, without the trailing `/`.
3. **Gate.** Read the `Verdict:` line. `kill` → `Stopped: Gate: kill`. `needs-clarification` → `Stopped: Gate: needs-clarification, <re-runs> re-run(s)`. `unknown` (decision unreadable) → `Stopped: Gate: unknown verdict`. `go` with `Result: stopped` (no handoff section) → `Stopped: Gate: assess <its Stopped>`. `kill` → report, stop, `Resolution: not run (stopped)`. `needs-clarification`, `unknown`, and `go` without the section → run step 7 on the chained `Resolution:` lines (a chained `not run` keeps `Resolution: not run (stopped)`), without re-entering the assessment, then print the Output with `Stopped:` and end; no implementation exists to ship. `go` with `Next: handoff ready` → step 4.
4. **Build.** Read the section whose heading starts with `## If go` in `.specify/assessments/<slug>/decision.md`, up to the next `##` heading. Invoke the `cdk:run-spec-kit` skill via the Skill tool with that section body verbatim. Its `Result: cancelled`, or `Stopped:` at any step other than step 10 (Implement, converge, address) → `Stopped: Build: run-spec-kit <its Stopped>`; `cancelled` reports `Resolution: not run (cancelled)` and stops, any other stop runs step 7 on what is left (the `Open:` items and the chained `Resolution:` lines) without re-entering the build, then prints the Output with `Stopped:` and ends. Not converged or open items, including run-spec-kit stopping after 5 rounds → continue; the MR review loop surfaces them. `Addressed:` `<c> of them CRITICAL` with c > 0, or any item listed under `Open:` starts with `CRITICAL:` → AskUserQuestion: Stop (Recommended) | Commit + push + open MR or PR anyway; unresolved CRITICAL findings should not reach an MR unasked. Stop → `Result: stopped`; run step 7 on the `Open:` items (the CRITICAL ones included) and the chained `Resolution:` lines without re-entering the build, then print the Output with `Stopped: Build: CRITICAL findings open` and end.
5. **Branch.** Current = `git rev-parse --abbrev-ref HEAD`. Protected per `${CLAUDE_SKILL_DIR}/../commit-changes/conventions.md` `## Protected branch` (host row, else fallback list) → skip, no ask; ship-changes switches off it with `feat <slug>`. Else Spec Kit branch (`001-<name>`) → keep it, no ask; later `speckit-*` commands find the feature directory from that branch name; report `Branch: <current> (kept: Spec Kit branch)`. Else not `feat/*` → invoke the `cdk:switch-branch` skill via the Skill tool with `feat <slug>`, no ask; its `Result: stopped | cancelled` → `Stopped: Branch: <its Stopped>`; `cancelled` reports `Resolution: not run (cancelled)` and stops, `stopped` runs step 7 on what is left without re-entering the branch step, then prints the Output with `Stopped:` and ends.
6. **Ship.** Invoke the `cdk:ship-changes` skill via the Skill tool with `feat <slug>` as the branch hint, so cdk:switch-branch picks the `feat/` type. Its `Result: stopped | cancelled` → `Stopped: Ship: <its Stopped>`; `cancelled` reports `Resolution: not run (cancelled)`, `stopped` runs step 7 on what is left without re-entering the ship step, then prints the Output with `Stopped:`; `nothing-to-do` → `Result: nothing-to-do`. Report, end.
7. **Resolve findings.** Per resolve-findings.md. Orchestrator: collect only what the chained skills' `Resolution:` lines left open (keep those lines from each chained Output; including run-spec-kit's `Resolution:` line and `Open:` items); ask nothing under `cdk:ship-changes` settings; report each with its recommended fix.

## Output

```text
Assessment: .specify/assessments/<slug>/ (<verdict>)
Feature: specs/<feature> | none
Implement: <rounds> round(s), converged | not converged (<k> tasks left) | skipped
Open: <one line per open item from run-spec-kit> | none
Branch: <name> [(kept: Spec Kit branch)] | none
Commits: <count> new (pushed | not pushed) | none
Excluded: <files> | none
MR: !<iid> <web_url> | PR: #<n> <url> | none
Rounds: <r> of 5 | none
Last review: gitlab: <n> inline, <m> general (<b> blocking, <p> praise) | github: <b> blocking, <s> suggestions | none
Merged: yes | no (<reason>) | none
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
