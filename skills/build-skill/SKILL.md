---
name: build-skill
description: Creates, updates, or improves a skill or slash command in any scope, then checks and scores it against a 100-point rubric. Use only when the user explicitly asks to build, improve, or update a skill.
argument-hint: '[skill name or path] [what it should do]'
allowed-tools: Read Glob Grep Skill Agent AskUserQuestion Bash(claude plugin validate *) Bash(node ${CLAUDE_SKILL_DIR}/scripts/check-skill.mjs *)
---

# Build skill

Input: $ARGUMENTS

## Rules

- Rigor: never guess or invent: confirm each path, command, and fact by reading it; ask (unattended: record) what the input and repo cannot answer. Finish every step in full, think twice before each irreversible step, and re-check the result against these rules and the repo's standards before reporting.
- Efficiency: read only what a step needs, keep output terse, and take the fewest steps that meet the goal; spawn only the agents in a `## Spawn briefs` bullet (`modes.md`, `score.md`), independent ones in one parallel turn, never `Explore` or `general-purpose`.
- Self-contained: follow only the files linked below; never link, read, or copy from another skill's files. `skill-creator` is optional, for evals only.
- Ask with AskUserQuestion: at most 4 questions per batch, recommendation first with a one-line reason, and a Stop option on every batch (Stop → `Result: cancelled`). Skip a question the input already answers.
- Loops: interview at most 3 rounds; improve rounds at most 3. Never loop past the cap; report what is left in `Open:`.
- Only `cdk:rubric-improver` applies score fixes.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- `validate-plugin` runs once with the plugin root path; a failure goes to `Open:` with no retry.
- Never write outside the chosen scope's skill directory. No file is created or modified before the user confirms the gate (purpose summary, absolute target path, change list). Never `Write` over an existing path; update uses `Edit` only, after the change list is confirmed, and never deletes a section without asking.
- Unattended: more than one match, an existing target, an unknown scope, or an unconfirmed gate → `Result: stopped`; a timed-out or idle answer is never Confirm.
- Never invent a frontmatter field; use only those in `${CLAUDE_SKILL_DIR}/references/frontmatter.md`.
- Name a skill by its action, verb-first (`review-code`), never by the actor (`code-reviewer`).
- One skill, one job. Several jobs found at Extract → ask Split | Pick one | Stop; never build a multi-job skill.
- `check-skill` is the source of truth for mechanical rules: never hand-check what it covers, never edit a skill only to silence it.

## Phases

| Phase     | Steps | Reference                                   |
| --------- | ----- | ------------------------------------------- |
| Discover  | 1–3   | `modes.md`                                  |
| Baseline  | 4     | `modes.md` (improve only)                   |
| Interview | 5–6   | `interview.md`, `decide.md`                 |
| Gate      | 7     | `interview.md`                              |
| Build     | 8     | `frontmatter.md`, `body.md`, `templates.md` |
| Score     | 9–11  | `score.md`                                  |
| Finish    | 12–13 | `evals.md`, Output                          |

## Workflow

1. **Extract.** Pull goal, name, triggers, arguments, side effects, outputs from the input; more than one job → ask per `${CLAUDE_SKILL_DIR}/references/decide.md` `## One job`. No name yet → ask it now (verb-first, per `decide.md` `## Name`), before Locate.
2. **Locate and evidence.** In one parallel turn spawn `cdk:skill-analyzer` (`kind: locate`), `cdk:skill-analyzer` (`kind: evidence`), and, for an external tool, `cdk:topic-researcher` per `${CLAUDE_SKILL_DIR}/references/modes.md`.
3. **Mode.** Pick create, update, or improve from the `modes.md` `## Mode` table (more than one match → ask); apply its `## Guards` (legacy command, managed skill). Update and improve: read the matched `SKILL.md` and its linked files.
4. **Baseline.** Improve only: check, score, and `cdk:skill-analyzer` (`kind: audit`) in parallel; the user picks the findings per `modes.md` `## Baseline`. No finding and score 100 → `Result: nothing-to-do`.
5. **Interview.** Ask only what blocks a good result, weighted and cited, per `${CLAUDE_SKILL_DIR}/references/interview.md`; Stop → `Result: cancelled`.
6. **Scope and kind.** Existing skill: from its path and the match's `kind`. Create: skip what the interview settled, else ask Personal | Project | Plugin and Reference | Task | Background-only per `decide.md`, then only the flags `## Invocation` cannot derive; apply the `modes.md` `## Guards` `Target exists` line of the chosen scope.
7. **Gate.** Show the purpose summary with `Target: <absolute path>` and, for update, the change list: Confirm | Revise | Stop per `interview.md` `## Gate`.
8. **Build.** Create writes new files only, per `${CLAUDE_SKILL_DIR}/references/frontmatter.md`, `${CLAUDE_SKILL_DIR}/references/body.md`, and `${CLAUDE_SKILL_DIR}/assets/templates.md`; update uses `Edit` only on the files read at step 3.
9. **Check and score.** Run `check-skill`, spawn `cdk:rubric-scorer` with `kind: skill` and its JSON, per `${CLAUDE_SKILL_DIR}/references/score.md`.
10. **Report.** Show the score table and deductions per `score.md` `## Report`. Check passes with no deductions, or 3 rounds done → step 12.
11. **Improve.** Spawn `cdk:rubric-improver` (`kind: skill`, plus the approved `audit findings`) per `score.md` `## Improve round`, then repeat steps 9 and 10.
12. **Evals.** Unattended → `Evals: skipped`, no question. Only when `skill-creator` is in the session's skill list: AskUserQuestion Skip (Recommended) | Run skill-creator evals | Stop; follow `${CLAUDE_SKILL_DIR}/references/evals.md`. Not listed → `Evals: n/a`.
13. **Output.** Print the block below, nothing else.

## Files

- For locating, modes, overwrite guards, the baseline, and analyzer spawn briefs (steps 2–4), see `${CLAUDE_SKILL_DIR}/references/modes.md`.
- For the evidence-backed interview and the gate (steps 5, 7), see `${CLAUDE_SKILL_DIR}/references/interview.md`.
- For scope, kind, invocation, the name rule, and the one-job rule, see `${CLAUDE_SKILL_DIR}/references/decide.md`.
- For the optional skill-creator evals step, see `${CLAUDE_SKILL_DIR}/references/evals.md`.
- For frontmatter fields and description writing, see `${CLAUDE_SKILL_DIR}/references/frontmatter.md`.
- For body structure, lazy loading, and navigation, see `${CLAUDE_SKILL_DIR}/references/body.md`.
- For skeletons per kind, see `${CLAUDE_SKILL_DIR}/assets/templates.md`.
- For running the check, the report, the improve round, `Open:`, and spawn briefs (steps 9, 11), see `${CLAUDE_SKILL_DIR}/references/score.md`.
- For the scoring criteria, see `${CLAUDE_SKILL_DIR}/references/rubric.md`.
- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For the mechanical checks, run `${CLAUDE_SKILL_DIR}/scripts/check-skill.mjs`; it is run, never read.

## Output

```text
Scope: Personal | Project | Plugin
Kind: Reference | Task | Background-only
Mode: create | update | improve
Baseline: <n>/100 | n/a
Files: <paths>
Invoke: /<name> | Claude only | user only
Score: <n>/100 (pass | below 95)
Rounds: <n>/3
Checks: check-skill pass | fail; validate-plugin pass | fail | n/a
Evals: run | skipped | n/a
Open: <rubric deductions left | none>
Next: /cdk:commit-changes | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
