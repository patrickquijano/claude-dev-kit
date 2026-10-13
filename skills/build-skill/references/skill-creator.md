# skill-creator handoff

build-skill drafts with cdk rules and verifies structure; `skill-creator:skill-creator` adds evals. The handoff is opt-in.

## Availability and opt-in

- `skill-creator:skill-creator` not in the skill list → skip, `Checks: evals skipped — not installed`.
- Unattended run (chained, `--auto`, `--yes`) → skip, `evals skipped — unattended`.
- Else one AskUserQuestion: "Run skill-creator evals" | "Skip". Recommend Skip for small edits or Reference skills; recommend running for a new Task skill or a large rewrite.

## Invoke

Use the Skill tool in the main thread, never the Agent tool. State in the conversation:

- the draft path; skip capture and interview, go straight to evals (existing draft → eval);
- keep the side-effect description clause;
- `argument-hint` and other Claude Code fields are valid; ignore `quick_validate` complaints about them;
- put the workspace and `evals.json` in a temp workspace path outside the skill dir, never inside `skills/<name>/`.

## After it returns

- Accept description or body edits only when they keep cdk rules (frontmatter.md, body.md, and the target's `.claude/rules/skills.md` when present); remove nothing without asking.
- Stray `evals/` or workspace dirs inside the skill dir → report and ask before deleting.
- Re-run Verify once; never loop back into the handoff (cap 1).
- Never run `claude plugin eval`.
