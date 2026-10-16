# Evals

Step 7 of `SKILL.md`: optional; runs only when `skill-creator` is in the session's skill list and the user picks it.

`skill-creator` not listed → `Evals: n/a`; mention `/plugin install skill-creator@claude-plugins-official` as information only, never stop.

Pass this as the Skill tool `args`, filled in:

```text
Run evals on the finished skill at <absolute skill path>.
Run only your eval loop; do not rewrite the skill outside it.
Return: eval results and any files you changed.
```

If evals changed any files, re-run `check-skill` once and send failures to `Gaps:`.
