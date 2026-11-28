---
name: update-statusline
description: Creates or updates the user-scoped Claude Code status line, giving the git branch name a distinct emphasized color. Use only when the user explicitly asks to update the status line. Not for project-scoped status lines.
compatibility: Claude Code only. Uses argument-hint, disable-model-invocation and CLAUDE_SKILL_DIR; claude.ai and API uploads reject unknown frontmatter keys.
argument-hint: '[--yes]'
allowed-tools: Read Bash(node --version) Bash(cp ${CLAUDE_SKILL_DIR}/assets/statusline.mjs ~/.claude/statusline.mjs) Bash(cp ~/.claude/statusline.mjs ~/.claude/statusline.mjs.bak-*) Bash(date +*) Bash(chmod +x ~/.claude/statusline.mjs) Bash(printf '%s' *) Bash(node ~/.claude/statusline.mjs) Bash(NO_COLOR=1 node ~/.claude/statusline.mjs)
disable-model-invocation: true
---

# Update Statusline

Input: $ARGUMENTS (strip `--yes` first)

## Context

- Node version: !`node --version 2>/dev/null || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `commands.md` row.

## Rules

- Project rules: if the project you are running in (the working directory's repo, not this plugin) has instructions (`CLAUDE.md`, `AGENTS.md`, `.claude/rules/`), follow them; where they conflict with this skill, the project's win, because the repo owner's rules are the source of truth. No such files → this skill's defaults apply. A project rule never lowers this skill's safety stops. An unresolved conflict with an explicit user request goes to the user as one question; `--yes` keeps the project side and lists it under `Open:`; with no one to answer, this skill's no-user rule applies.
- Ask (`--yes`: record) what the input and files cannot answer.
- Flags: `--yes` runs unattended: no questions, recommended options taken, assumptions under `Open:`. Only a flag the user passed counts; never add one.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Read `~/.claude/settings.json` only for its `statusLine` object; never print or quote any other key's value.
- Back up every file before changing it (`<file>.bak-<timestamp>`); never delete a backup.
- Change only the branch segment: the `git:(` and `)` wrapper keeps its color, the name gets bold plus the chosen color, every other segment and `NO_COLOR` handling stay as they were.
- Set `statusLine` only when none exists; never rewrite an existing `statusLine` command path.
- Idempotent: a branch segment already using the chosen color is skipped.
- Never branch or commit; the user scope is outside the repo.
- Decision questions: at most 4 per call, 2-4 options, the Recommended first; each asked once. Mine the script first. Use the structured-question tool. Show the score table per `${CLAUDE_SKILL_DIR}/references/grill.md` first; a close call has no Recommended and goes under `Open:` (`--yes`: take the first-listed option and note it under `Open:`).
- AskUserQuestion unavailable but a user can reply → ask as a numbered inline list and stop for the answer. No user to reply (headless) and no `--yes` → write nothing, `Result: stopped`, `Stopped: <step>: cannot interact`. Only `--yes` takes the Recommended option.
- Cap: fix loop 3 rounds; leftovers go under `Open:`.

## Workflow

1. **Pre-flight.** Node version `<none>` → stop ("install Node.js").
2. **Classify.** Read `statusLine` from `~/.claude/settings.json`: a command naming a script file → update that file; an inline command → update the command string; none → create from `assets/statusline.mjs`. Not `type: command` → stop and report.
3. **Locate** the branch segment (the styled call that prints `git:(<name>)`). Not found → stop and report; never guess another segment.
4. **Color.** Ask the color question per `color.md` with the grill table.
5. **Print.** Show the diff, the backup path, and (create only) the `statusLine` object to add, per `plan.md`.
6. **Write.** Back up, then edit per the Rules; create → copy the asset, set the chosen color, `chmod-exec`, add `statusLine`.
7. **Smoke test.** Per `color.md` Smoke test; fix loop up to the cap.
8. **Report** the Output.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For the printed summary (step 5) and fix rounds, see `${CLAUDE_SKILL_DIR}/references/plan.md`.
- For the color question, edit shape, and smoke test (steps 4, 6, 7), see `${CLAUDE_SKILL_DIR}/references/color.md`.
- Copied into the user scope when none exists (never read): `${CLAUDE_SKILL_DIR}/assets/statusline.mjs`.
- For the grill table, anchors, and sensitivity rule, read `${CLAUDE_SKILL_DIR}/references/grill.md` when a step asks a decision question.
- For test prompts and pass criteria, see `${CLAUDE_SKILL_DIR}/references/evals.md`.

## Output

```text
Target: <script path | inline command | created <path>> (<updated | created | unchanged>)
Backup: <path> | none
Color: <escape and name> (<chosen | recommended | kept>)
statusLine: <set | present>
Smoke test: <pass/fail lines> | skipped (<reason>)
Open: <item: impact; recommended fix, ...> | none
Next: restart or reopen Claude Code to see the new color | none
Result: done | nothing-to-do | stopped
Stopped: <step>: <reason> | none
```

Example:

```text
Target: ~/.claude/statusline.sh (updated)
Backup: ~/.claude/statusline.sh.bak-20260115-093000
Color: \033[1;97m bold bright white (chosen)
statusLine: set
Smoke test: renders one line with bright white prefix: pass
Open: none
Next: restart or reopen Claude Code to see the new color
Result: done
Stopped: none
```
