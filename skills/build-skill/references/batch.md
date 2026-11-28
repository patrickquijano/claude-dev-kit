# Batch

A plugin directory as input with no new-skill purpose means improve: improve every skill in it, each on its own. A plugin directory plus a new skill's purpose is one create run at plugin scope, not a batch.

## Steps

1. Glob `<plugin dir>/skills/*/SKILL.md`; none → `Result: stopped`, `Stopped: 1: no skills`.
2. Run steps 1–10 of `SKILL.md` once per skill, in improve mode, one skill at a time; the spec's write scope is that one skill's directory.
3. A Fail or a stop in one skill never stops the others, and nothing is fixed across skills.
4. Print one combined report: the Output block of each skill, then a totals line.

## Totals line

```text
Batch: <n> skills, <d> done, <s> stopped, <t> nothing-to-do
```
