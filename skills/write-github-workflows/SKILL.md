---
name: write-github-workflows
description: Create or update modular GitHub Actions workflows: one orchestration workflow calls one reusable workflow per job, with least-privilege permissions, timeouts, caching, and freshly resolved action versions. Use only when the user explicitly asks to write or modularize GitHub Actions workflows, e.g. "add a CI workflow". Do not use on your own after finishing a task.
argument-hint: '<requirements | workflow path>'
allowed-tools: Bash(git rev-parse *) WebFetch(domain:docs.github.com) WebFetch(domain:github.com) WebFetch(domain:securitylab.github.com)
---

# Write GitHub Workflows

Input: $ARGUMENTS

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

A Context value of `<none>` means that read failed. A missing value or `[shell command execution disabled by policy]` means run that command's `commands.md` row instead.

## Rules

- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- User interaction (AskUserQuestion) and writes only here; `cdk:workflow-analyzer`, `cdk:actions-version-resolver`, and `cdk:workflow-reviewer` are read-only.
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/../shared/references/fallbacks.md`.
- No invented facts: triggers, commands, runtime versions, secret and variable names, environments, and services come from the input, the repo, or the resolver. Not derivable → ask. Nothing is written until every item is settled.
- Apply every **Required** item in `${CLAUDE_SKILL_DIR}/references/practices.md` and every other item that fits; each says why. Skipped item → reason in the Output.
- Versions are never hardcoded in this skill: resolve every action, reusable workflow, runner label, and image per `${CLAUDE_SKILL_DIR}/references/versions.md` on each run, then write the verified values into the workflows (Actions cannot resolve them at run time). Never `ubuntu-latest`, `latest`, a bare major, or a floating alias. Unverifiable → ask or stop; never guess or use an older remembered value.
- Structure per `${CLAUDE_SKILL_DIR}/references/layout.md`: one orchestrator holding triggers and caller jobs, one `workflow_call` file per job, inputs, secrets, permissions, and outputs passed explicitly (never `secrets: inherit`).
- Scripts are POSIX `sh` only, set via `defaults.run.shell: sh`; untrusted and secret values only through step `env:`.
- Update mode changes only what the request needs; keep triggers and behavior; keep job `name` values unless modularizing renames a required check, in which case the gate job supersedes that rule and required checks move to it. Modularize only workflows the request touches. New names follow `${CLAUDE_SKILL_DIR}/references/practices.md` `## Naming`; existing names are kept unless the user approves a rename.
- Never run a workflow, push, open a PR, or change repository or organization settings. Writes are limited to `.github/workflows/` and `.github/dependabot.yml` (update mode touches Dependabot only per `practices.md` `## Dependabot`).
- Every write to an existing file prints its diff; no approval asked, since the files are local and reviewable.
- Loops: clarify (step 3) max 3 rounds; verify-fix (step 9) max 3 attempts; clarify cap hit, or a failure before findings exist → print the Output with `Stopped: <step>: <reason>` and end; verify cap hit, or a failure after findings exist → run step 10 (**Resolve findings.**) on what is left, without re-entering the loop, then print the Output with `Stopped: <step>: <reason>` and end.
- Final step: follow `${CLAUDE_SKILL_DIR}/../shared/references/resolve-findings.md` (scope: edit; sources: `Unresolved:`, `Skipped practices:`, `Retained constraints:`, `Checks:` findings, fail, or not installed).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../shared/references/known-issues.md` with slug `write-github-workflows` and store `${CLAUDE_PLUGIN_DATA}/known-issues`; it covers subagent `Known issue:` lines.

## Workflow

1. **Pre-flight.** Root = Context → Repo root, else cwd. Mode: input names or matches an existing workflow, or `.github/workflows/` has files the request touches → update; else create. Input too thin to name any trigger or job → step 3.
2. **Analyze.** Spawn `cdk:workflow-analyzer` with the root, a request summary, `${CLAUDE_SKILL_DIR}/references/versions.md`, and `${CLAUDE_SKILL_DIR}/references/practices.md`. Use its facts (`Root`, `Stack`, `Commands`, `Workflows`, `Reusables`, `Actions`, `Services`, `Environments`, `Secrets`, `Vars`, `Naming` (with per-file conformance), `Dependabot`, `Required checks`, `Pinning signals`, `Questions`); do not re-read the repo.
3. **Clarify.** Derive the design from the input and the analyzer; ask only what stays missing, in one AskUserQuestion call; nothing left to change → `Result: nothing-to-do`; max 3 rounds. Detail: `${CLAUDE_SKILL_DIR}/references/clarify.md`.
4. **Docs check.** WebFetch only the pages named in `practices.md` for features this request uses (for example services, environments, concurrency), always the Dependabot options page; a fact that differs from `practices.md` → follow the doc, record it under `Docs checked`. Skip for features unused.
5. **Resolve.** Spawn `cdk:actions-version-resolver` with `${CLAUDE_SKILL_DIR}/references/versions.md`, the actions, remote reusable workflows, images (with variant and major.minor), runner need and architecture, and the analyzer's pinning signals. Items in its `Unresolved` → one AskUserQuestion (inside the step 3 cap) or `Stopped` (run step 10 (**Resolve findings.**) on what is left, without re-entering the loop, then print the Output with `Stopped:`); this includes `Pinning: unknown` (options SHA recommended, tag) and a newest runner label that is not an LTS `.04` release (options newest, newest LTS). Keep its table for steps 6, 9, and 11.
6. **Draft.** Per `layout.md` and `practices.md`: the orchestrator and one callee per job from the resolver table, plus the `_gate.yml` callee for a touched job with a required check, and `.github/dependabot.yml`. Update mode → edit in place, list each change with its reason. Detail: `${CLAUDE_SKILL_DIR}/references/draft.md`.
7. **Plan.** Print the file list with a one-line purpose each, the resolved versions table, and the diff for existing files; then write without asking.
8. **Write** the files under `.github/workflows/` and `.github/dependabot.yml`.
9. **Verify.** Spawn `cdk:workflow-reviewer` with the workflow paths and `.github/dependabot.yml` when written, `${CLAUDE_SKILL_DIR}/references/practices.md`, `${CLAUDE_SKILL_DIR}/references/layout.md`, the resolver table, the pinning mode, the list of files written, the existing names kept or renamed with approval, and in update mode the diff. Use its `Findings`, `Checks`, `Tool output`. Each `error` or `warning` → fix, print the diff, write, re-run (cap in Rules). `info` → list only.
10. **Resolve findings.** Per resolve-findings.md. Edit only the files this run wrote. Itemize `Unresolved:` and each `Checks:` entry (including `naming` and `zizmor`) with `n findings`, `fail`, `unverified`, `error (…)`, or `not installed`; a tool `error` is reported with no fix loop.
11. **Report** the output below.

## Output

```text
Mode: create | update
Files:
- <path> — <created | modified> — <purpose> (workflows and `.github/dependabot.yml`)
Workflows: <orchestrator> → <callee>, …
Versions:
- <ref> — <tag or label> — <sha | digest | -> — <source URL>
Runner: <label> (<basis>)
Pinning: <tag | SHA> (<rule matched | user choice>)
Docs checked: <page — result>, … | none
Checks: actionlint <pass | fail | not installed | error (<first line>)>, contracts <ok | n findings>, posix <ok | n findings>, naming <ok | n findings>, zizmor <pass | fail | not installed | error (<first line>)>, pins <ok | n findings>, gate <ok | n findings | n/a>, yaml <pass | fail | unverified>
Assumptions: <item>, … | none
Retained constraints: <item (branch protection or rulesets must require the gate check; never edited here)>, … | none
Skipped practices: <item — reason> | none
Policy applied: <cdk policy item — see practices.md>, … | none
Check-name map: <old check → new check (format unverified)>, … | none
Unresolved: <item — reason> | none
Known issues: <saved store file | memory file | printed line>, … | none
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
