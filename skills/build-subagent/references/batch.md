# Batch

A plugin directory as input with no new-subagent purpose: update or improve every subagent in it, each on its own. A plugin directory plus a new subagent's purpose is one create run at plugin scope, not a batch.

## Steps

1. Glob `<plugin dir>/agents/**/*.md`; none → `Result: stopped`, `Stopped: 1: no subagents`.
2. Run steps 1–12 of `SKILL.md` once per subagent file, in update or improve mode, one subagent at a time; the spec's write scope is that one subagent's file.
3. A Fail or a stop in one subagent never stops the others, and nothing is fixed across subagents.
4. Print one combined report: the Output block of each subagent, then a totals line.

## Totals line

```text
Batch: <n> subagents, <d> done, <s> stopped, <t> nothing-to-do
```
