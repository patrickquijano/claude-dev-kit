---
name: update-statusline
description: Creates or updates the user-scoped Claude Code status line, giving the git branch name a distinct emphasized color. Use only when the user explicitly asks to update the status line.
compatibility: Claude Code only. Uses argument-hint, disable-model-invocation and CLAUDE_SKILL_DIR; claude.ai and API uploads reject unknown frontmatter keys.
argument-hint: '[--yes] [--no-plan]'
allowed-tools: Read Bash(node --version) Bash(cp ${CLAUDE_SKILL_DIR}/assets/statusline.mjs ~/.claude/*) Bash(cp ~/.claude/statusline.mjs ~/.claude/statusline.mjs.bak-*) Bash(date +*) Bash(chmod +x ~/.claude/*) Bash(printf *) Bash(node ~/.claude/statusline.mjs) Bash(NO_COLOR=1 node ~/.claude/statusline.mjs)
disable-model-invocation: true
---

# Update Statusline

Input: $ARGUMENTS (strip `--yes` and `--no-plan` first)

## Context

- Node version: !`node --version 2>/dev/null || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `commands.md` row.

## Rules

- Ask (`--yes`: record) what the input and files cannot answer.
- Flags: `--yes` = unattended (no plan mode, no questions, recommended option, assumptions under `Open:`); `--no-plan` skips plan mode only and every question is still asked. Only a flag the user passed counts, never add one. `--yes` never covers replacing the user's script or command with the bundled asset: it is asked, or skipped and listed under `Open:`.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Read `~/.claude/settings.json` only for its `statusLine` object; never print or quote any other key's value.
- Back up every file before changing it (`<file>.bak-<timestamp>`); never delete a backup.
- Change only the branch segment: the `git(` and `)` wrapper keeps its color, the name gets bold plus the chosen color, every other segment and `NO_COLOR` handling stay as they were.
- Set `statusLine` only when none exists; never rewrite an existing `statusLine` command path.
- Idempotent: a branch segment already using the chosen color is skipped.
- Never branch or commit; the user scope is outside the repo.
- Decision questions: at most 4 per call, 2-4 options, the Recommended first; each asked once. Mine the script first. Use the structured-question tool (unavailable → take the Recommended and list it under `Open:`). Show the score table per `${CLAUDE_SKILL_DIR}/references/grill.md` first; a close call has no Recommended and goes under `Open:`.
- Approval: nothing is written before the `ExitPlanMode` approval after step 5 (`plan.md`); each step 7 fix round re-enters plan mode. Declined → `Result: stopped`, `Stopped: 0: plan mode declined`; 3 rejections → `Result: cancelled`, `Stopped: <step>: plan rejected` (5 for the plan, 7 for a fix round). `--no-plan` replaces approval with an ask `Apply` | `Stop`.
- No way to ask and no `--yes` → write nothing, `Stopped: 0: cannot interact`.
- Cap: fix loop 3 rounds; leftovers go under `Open:`.

## Workflow

1. **Pre-flight.** Node version `<none>` → stop ("install Node.js"). Enter plan mode per `${CLAUDE_SKILL_DIR}/references/plan.md` (`--no-plan` | `--yes`: skip).
2. **Classify.** Read `statusLine` from `~/.claude/settings.json`: a command naming a script file → update that file; an inline command → update the command string; none → create from `assets/statusline.mjs`. Not `type: command` → stop and report.
3. **Locate** the branch segment (the `paint` call that prints `git(<name>)`). Not found → stop and report; never guess another segment.
4. **Color.** Ask the color question per `color.md` with the grill table.
5. **Plan.** Show the diff, the backup path, and (create only) the `statusLine` object to add; `ExitPlanMode`.
6. **Write.** Back up, then edit per the Rules; create → copy the asset, set the chosen color, `chmod-exec`, add `statusLine`.
7. **Smoke test.** Per `color.md` Smoke test; fix loop up to the cap, each round in plan mode.
8. **Report** the Output.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For the plan-mode entry (step 1) and fix rounds, see `${CLAUDE_SKILL_DIR}/references/plan.md`.
- For the color question, edit shape, and smoke test (steps 4, 6, 7), see `${CLAUDE_SKILL_DIR}/references/color.md`.
- Copied into the user scope when none exists (never read): `${CLAUDE_SKILL_DIR}/assets/statusline.mjs`.
- For the grill table, anchors, and sensitivity rule, read `${CLAUDE_SKILL_DIR}/references/grill.md` when a step asks a decision question.
- For test prompts and pass criteria, see `${CLAUDE_SKILL_DIR}/references/evals.md`.

## Output

```text
Plan mode: entered | already active | declined | skipped (--no-plan | --yes)
Target: <script path | inline command | created <path>> (<updated | created | unchanged>)
Backup: <path> | none
Color: <escape and name> (<chosen | recommended | kept>)
statusLine: <set | present>
Smoke test: <pass/fail lines> | skipped (<reason>)
Open: <item: impact; recommended fix, ...> | none
Next: restart or reopen Claude Code to see the new color | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
