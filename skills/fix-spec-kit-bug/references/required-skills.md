# Required skills

Pre-flight for step 1.

- `.specify/` missing → tell the user to run `/cdk:setup-spec-kit` first, stop.
- Any of these `.claude/skills/<name>/` dirs missing → name the missing ones, tell the user to run `/cdk:setup-spec-kit`, stop; a partial chain fails after it has written files.
- Bug extension: `speckit-bug-assess`, `speckit-bug-fix`, `speckit-bug-test`.
