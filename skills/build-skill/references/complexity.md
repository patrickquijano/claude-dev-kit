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

- Both: add R11 to every loop; none without a loop.

## Rule texts

R11, the iteration rule:

```text
**Round limit.** Iterate at most <n> rounds; at the start of each round list the open findings and the fixes, then apply them; then report what is left.
```
