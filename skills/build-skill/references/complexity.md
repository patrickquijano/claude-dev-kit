# Complexity

Classifies a new skill as simple or non-simple (create only). The user's answer is final.

## Criteria

Score each 1–5 from a cited fact (file, step, or request line).

| ID  | Criterion               | Weight | 1                | 5                                      |
| --- | ----------------------- | ------ | ---------------- | -------------------------------------- |
| C1  | Files written or edited | 25     | none             | many files, or any outside scratch     |
| C2  | Input uncertainty       | 25     | fully specified  | ambiguous, needs discovery             |
| C3  | Reversibility and reach | 20     | local, easy undo | external, irreversible (push, release) |
| C4  | Fix iterations          | 15     | no loop          | loops of examine, test, or repair      |
| C5  | Steps                   | 10     | 1–3              | 10 or more                             |
| C6  | Tool reach              | 5      | read-only tools  | shell, network, or MCP side effects    |

## Formula

Total = Σ weight × score / 5; 50 or more is non-simple. Scratch writes and `git fetch --prune` count as read-only.

## Question

Ask Simple | Non-simple | Need more information (AskUserQuestion) with exactly one Recommended from the total, a one-line justification, and the strongest counter-argument. Within 10 points of 50 → ask 1–2 follow-ups first. The user's answer is final.

## Class rules

- Non-simple: R8 as step `0.`; remove approval gates that the plan already covers; apply R11 to every loop.
- Simple: R9 in the step just before the first write; no plan mode.
- Both: keep gates that guard external irreversible actions and genuine decisions; add R11 only when a loop exists.

## Rule texts

R8, the non-simple start step:

```text
0. **Plan mode.** Enter plan mode first (load `EnterPlanMode` with ToolSearch if deferred; already active → stay in it); read-only steps run inside it. Before creating, editing, or deleting any file or running any side-effect action, present the plan and wait for `ExitPlanMode` approval. Declined or unavailable → `Result: stopped`, `Stopped: 0: plan mode declined`; nothing is written.
```

R9, the simple gate:

```text
**Confirm.** State in at most 3 lines what will change, then ask Yes | No with AskUserQuestion; proceed only on Yes, else `Result: cancelled`.
```

R11, the iteration rule:

```text
**Plan mode (each round).** At the start of each iteration, before any fix, enter plan mode (load `EnterPlanMode` with ToolSearch if deferred), present the findings and proposed fixes, and wait for `ExitPlanMode` approval.
```
