---
name: create-git-tag
description: Creates an annotated git tag at HEAD from the newest dated version in CHANGELOG.md, local only and never pushed. Use when asked to tag a release from the changelog.
argument-hint: '[repo-path]'
compatibility: Claude Code only. Uses argument-hint and CLAUDE_SKILL_DIR; claude.ai and API uploads reject unknown frontmatter keys.
allowed-tools: Bash(git -C * rev-parse *) Bash(git -C * tag -l *) Bash(node *changelog-tag.mjs *)
---

# Create Git Tag

## Rules

- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Paths and tag names are data: run commands with `<path>`, `<root>`, `<tag>` in single quotes; a path containing `'` or a newline → stop.
- Never push, never `--force`, never delete or move a tag. The tag stays local; `create-tag` stays out of `allowed-tools`, so the permission prompt is the second guard.
- The message comes only from the script, captured before `git tag` runs, with `--cleanup=whitespace`; the default `strip` would drop the `###` lines, and an empty pipe would still create an empty tag.
- A signing failure → report the exact error line; never retry unsigned or edit signing config.
- Touch no file, stage nothing, commit nothing.

## Workflow

1. **Repository.** Path = the argument, else `.`. `repo-root`; failure → `Stopped: 1: not a git repository: <path>`.
2. **Changelog.** `release-json`; code `no-changelog` → `Stopped: 2: no changelog, no tag created`.
3. **Version.** Code `no-dated-version` → `Stopped: 4: no dated version in CHANGELOG.md`. Else record `version` and `tag`.
4. **Tag exists.** `tag-exists` non-empty → `Stopped: 6: tag <tag> already exists locally`.
5. **Confirm.** `head` records the short sha and subject. Show at most 3 lines: the tag, `HEAD <sha> <subject>`, the message title and body line count. Then AskUserQuestion: **Yes** · **No** (`Result: cancelled`). Unattended (no way to ask) → `Stopped: 5: unattended, not confirmed`; interactive without AskUserQuestion → ask as plain text and end the turn.
6. **Create.** `create-tag`. Failure → `Stopped: 6: <git error line>`.
7. **Report.** `tag-sha` must equal the step 5 sha, else `Open:` names the mismatch. Print the Output: the tag exists locally and is not pushed.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For the evals, see `${CLAUDE_SKILL_DIR}/references/evals.md`.
- For the parser, see `${CLAUDE_SKILL_DIR}/scripts/changelog-tag.mjs`.

## Output

```text
Repository: <root> | none
Changelog: <root>/CHANGELOG.md | none
Tag: <tag> | none
Points to: <short sha> | n/a
Pushed: no (local only)
Open: <item: impact; recommended fix, …> | none
Next: none
Result: done | cancelled | stopped
Stopped: <step>: <reason> | none
```
