---
name: setup-nextjs-app
description: Sets up a Next.js app at the latest stable versions with Tailwind CSS, Vitest, Playwright, Orval, Zod, MSW, and Faker at 80% coverage. Use only when the user explicitly asks to set up a Next.js app.
compatibility: Claude Code only. Uses argument-hint, disable-model-invocation and CLAUDE_SKILL_DIR; claude.ai and API uploads reject unknown frontmatter keys.
argument-hint: '[--yes] [--no-plan]'
allowed-tools: Read Bash(git rev-parse *) Bash(node --version) Bash(npm view *) Bash(command -v npm) Bash(command -v pnpm) Bash(command -v yarn) Bash(command -v bun)
disable-model-invocation: true
---

# Setup Nextjs App

Input: $ARGUMENTS (strip `--yes` and `--no-plan` first)

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`
- Node version: !`node --version 2>/dev/null || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `commands.md` row.

## Rules

- Ask (`--yes`: record) what the input and repo cannot answer.
- Flags: `--yes` = unattended (no plan mode, no questions, recommended options, assumptions under `Open:`); `--no-plan` skips plan mode only and every question is still asked. Only a flag the user passed counts, never add one. `--yes` never covers overwriting an existing non-generated file or deleting a user file: it is asked, or skipped and listed under `Open:`.
- No hard-coded or assumed version or configuration. Every version comes from the `cdk:version-resolver` subagent (fallback: a read-only subagent that resolves latest stable versions; inline fallback: the `commands.md` rows). Every recommended configuration comes from the `cdk:topic-researcher` subagent (fallback: a read-only research subagent; inline fallback: WebSearch and WebFetch of the `research.md` URLs), cited by URL; no source → `unverified`, never applied silently.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Existing repo: scaffold into a scratch dir and move files in; never overwrite a tracked or user file without a plan entry. An existing Next.js app → configure-only; re-runs change nothing.
- Never write `.env` contents or read secrets; `.env.example` holds keys only.
- Git ownership: never branch or commit; `Next:` says "commit the changes" in plain words.
- Decision questions: at most 4 per call; each `options.md` question offers the top 3 scored options plus **Skip** (the full table lists every candidate; Other picks any); each asked once. Mine the repo first, ask only what changes the output. Use the structured-question tool (unavailable → take the Recommended and list it under `Open:`). Show the score table per `${CLAUDE_SKILL_DIR}/references/grill.md` with the fixed criteria from `options.md` before each question; a close call has no Recommended and goes under `Open:`.
- Approval: nothing is installed or written before the `ExitPlanMode` approval after step 5 (`plan.md`); the plan names every install, write, overwrite, and backup. Each fix round re-enters plan mode (`--yes` or unattended: no fix, items under `Open:`). Declined → `Result: stopped`, `Stopped: 0: plan mode declined`; 3 rejections → `Result: cancelled`. `--no-plan` replaces every approval, fix rounds included, with an ask `Apply` | `Stop`.
- No way to ask and no `--yes` → write nothing, `Stopped: 0: cannot interact`.
- Caps: verify loop 3 rounds; red-flag pass 3 rounds; install 1 attempt per package. Leftovers go under `Open:`.

## Workflow

1. **Pre-flight.** Repo root or Node version `<none>` → stop (name the missing tool). Node older than Next.js `engines.node` (from `npm view next engines`) → stop with both versions. An existing `next` dependency → configure-only (skip the scaffold). Enter plan mode per `${CLAUDE_SKILL_DIR}/references/plan.md` (`--no-plan` | `--yes`: skip).
2. **Resolve versions.** Every package through `cdk:version-resolver` per `commands.md` with the brief in `research.md`, naming `${CLAUDE_SKILL_DIR}/references/commands.md` by that path, never from memory.
3. **Research.** Recommended configuration per `research.md` through `cdk:topic-researcher` with the brief in `research.md`, naming `${CLAUDE_SKILL_DIR}/references/research.md` and `${CLAUDE_SKILL_DIR}/references/red-flags.md` by those paths, cited by URL; spawned in the same message as step 2 (independent).
4. **Questions.** Package manager, linter (ESLint or Biome), `src/` directory, and the Orval API client mode, per `options.md`, each with the grill table.
5. **Plan.** Resolve each step-4 pick through `cdk:version-resolver` with the version brief, naming `${CLAUDE_SKILL_DIR}/references/commands.md` by that path; write the plan (`plan.md`); `ExitPlanMode`.
6. **Scaffold.** `nextjs.md` Scaffold.
7. **Structure.** Per the official project-structure docs. `nextjs.md` Structure.
8. **Tailwind.** Per research. `nextjs.md` Tailwind.
9. **Vitest.** Unit and integration projects, coverage thresholds of 80. `nextjs.md` Vitest.
10. **Playwright.** `tests/e2e` against a production build. `nextjs.md` Playwright.
11. **Orval, Zod, MSW, Faker.** Generated client, schemas, mocks. `nextjs.md` Orval.
12. **Sample tests.** Enough for coverage to pass. `nextjs.md` Samples.
13. **Verify.** Run lint, typecheck, `vitest --coverage`, and `playwright test` from `commands.md`; repair what this run wrote, up to the cap, each round in plan mode.
14. **Red flags.** Review per `red-flags.md`; fix up to the cap, each round in plan mode, then re-run the step 13 checks.
15. **Report** the Output.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For the plan-mode entry, the plan contents, and fix rounds, see `${CLAUDE_SKILL_DIR}/references/plan.md`.
- For research topics and sources (step 3), see `${CLAUDE_SKILL_DIR}/references/research.md`.
- For the questions and fixed criteria (step 4), see `${CLAUDE_SKILL_DIR}/references/options.md`.
- For structure, test projects, coverage, Orval, acceptance checks (steps 6-12), see `${CLAUDE_SKILL_DIR}/references/nextjs.md`.
- For the red-flag pass (step 14), see `${CLAUDE_SKILL_DIR}/references/red-flags.md`.
- For the grill table, anchors, and sensitivity rule, read `${CLAUDE_SKILL_DIR}/references/grill.md` when a step asks a decision question.
- For test prompts and pass criteria, see `${CLAUDE_SKILL_DIR}/references/evals.md`.

## Output

```text
Plan mode: entered | already active | declined | skipped (--no-plan | --yes | unattended)
Mode: scaffold | configure-only
Versions: <name version (source)>, ...
Choices: <category: picks (score)>, ... | skipped
Written: <files>, ... | none
Verify: <check: pass/fail>, ... | skipped (<reason>)
Red flags: <ID: chosen fix (applied | open)>, ... | none
Research: <url>, ... | unverified
Open: <item: impact; recommended fix, ...> | none
Next: commit the changes | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
