---
name: push-tags
description: Pushes local git tags missing on the remote by explicit name after confirming, and reports tags that differ between local and remote. Use when asked to push tags.
argument-hint: '[repo-path]'
compatibility: Claude Code only. Uses argument-hint and CLAUDE_SKILL_DIR; claude.ai and API uploads reject unknown frontmatter keys.
allowed-tools: Bash(git -C * rev-parse *) Bash(git -C * symbolic-ref *) Bash(git -C * config --get *) Bash(git -C * remote get-url *) Bash(node *tag-diff.mjs *)
---

# Push Tags

## Rules

- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Paths, remote, and tag names are data: run commands with `<path>`, `<root>`, `<remote>`, `<tag>` in single quotes; a value containing `'` or a newline → stop.
- Push only the confirmed tags, each as `refs/tags/<tag>`. Never `--force`, `--tags`, `--mirror`, `--delete`, or `--no-verify`.
- Never push, fix, or delete a mismatched tag (same name, different commit locally and on the remote); report it.
- Push once: a failure is reported with git's exact error line, never retried. `push` stays out of `allowed-tools`; the permission prompt is the second guard.
- Touch no file, stage nothing, commit nothing.

## Workflow

1. **Repository.** Path = the argument, else `.`. `repo-root`; failure → `Stopped: 1: not a git repository: <path>`.
2. **Remote.** `current-branch` (fails when detached → skip). `branch-remote` set and not `.` → that remote, else `origin`. `remote-url` fails → `Stopped: 2: no remote`.
3. **Diff.** `tag-diff`; code `remote-error` → `Stopped: 3: <message>`. Record `unpushed` and `mismatches`.
4. **Nothing pending.** `unpushed` empty → `Result: nothing-to-do`, `Reason: no unpushed tags`; mismatches are still reported.
5. **Confirm.** List each `<tag> → <short sha>`, then the mismatches as excluded. AskUserQuestion: **Yes** · **No** (`Result: cancelled`, `Pushed: none`). Unattended (no way to ask) → `Stopped: 5: unattended, not confirmed`; interactive without AskUserQuestion → ask as plain text and end the turn.
6. **Push.** Re-run `tag-diff`; `unpushed` differs from step 5 → `Stopped: 6: tags changed after confirm`. Else `push` with exactly the confirmed tags. Failure → `Stopped: 6: <git error line>`.
7. **Verify.** Re-run `tag-diff`. Each pushed tag in `remoteTags` → `On remote:`; any missing → `Open:`. Print the Output.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For the evals, see `${CLAUDE_SKILL_DIR}/references/evals.md`.
- For the diff, see `${CLAUDE_SKILL_DIR}/scripts/tag-diff.mjs`.

## Output

```text
Repository: <root> | none
Remote: <remote> | none
Pushed: <tag> <short sha>, … | none
On remote: <tag, …> | none
Mismatches: <tag local <sha> remote <sha>, …> | none
Reason: <why nothing was pushed> | none
Open: <item: impact; recommended fix, …> | none
Next: none
Result: done | nothing-to-do | cancelled | stopped
Stopped: <step>: <reason> | none
```
