# Required skills

Pre-flight for step 1.

- `.specify/` missing → tell the user to install Spec Kit (`specify init`) and its Claude integration first, `Result: stopped`, `Stopped: Pre-flight: Spec Kit not set up`, stop.
- Any of these `.claude/skills/<name>/` dirs missing → name the missing ones, tell the user to install the bug extension and Spec Kit's Claude integration, `Result: stopped`, `Stopped: Pre-flight: Spec Kit not set up`, stop; a partial chain fails after it has written files.
- Bug extension (third-party): `speckit-bug-assess`, `speckit-bug-fix`, `speckit-bug-test`.
