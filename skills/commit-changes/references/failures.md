# Failures

Details step 8 (**Commit**) failure paths. Commands run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`.

`switch-branch` fails → report exact error line, run step 11, then print the Output with `Stopped:`. Signing fails → stop per conventions.md `## Signing`, after step 11. Other hook failure → diagnose root cause, fix, re-stage, commit again (cap in Rules; cap hit → step 11, then `Stopped:`).
