# Hand-off brief to skill-creator

`skill-creator` not in the session's skill list → stop and report how to install it: `/plugin install skill-creator@claude-plugins-official`.

Pass this as the Skill tool `args`, filled in:

```text
Create | Update the skill at <target path> (scope: <scope>).
Decisions: kind <kind>; invocation <flags or none>; goal <one line>; triggers <phrases>; arguments <hint or none>; side effects <list or none>; outputs <list>.
Apply, in this order of precedence over your defaults:
1. <skill dir>/references/frontmatter.md (fields, limits, description writing)
2. <skill dir>/references/body.md (structure, lazy loading, style)
3. the matching skeleton in <skill dir>/assets/templates.md
Constraints: write only under the target directory; keep SKILL.md under 500 lines; do not add frontmatter fields beyond frontmatter.md; run your own test loop only if the user asks for evals.
Return: files written and any open question.
```

`<skill dir>` = this skill's absolute directory (the `${CLAUDE_SKILL_DIR}` value from SKILL.md); pass absolute paths so they resolve from the other skill.
