# Subagent Score Rubric (1–5)

Informational only: the score never changes a result, blocks, or triggers a fix. The checklist in `checks.md` is the only gate.

## Categories

| Category               | Check IDs |
| ---------------------- | --------- |
| Frontmatter            | F1–F10    |
| Structure and location | S1–S5     |
| Prompt quality         | P1–P8     |
| Tools and permissions  | T1–T7     |
| Testing                | E1–E2     |

`O1` and `O2` are excluded from every category.

## Scale

Score each category from its Fail count in the report:

| Fails     | Score |
| --------- | ----- |
| 0         | 5     |
| 1         | 4     |
| 2         | 3     |
| 3         | 2     |
| 4 or more | 1     |

- A Not checked check is excluded: it is neither a Fail nor a Pass.
- A category whose checks are all Not checked scores `N/A` (Testing always).
- Overall = the mean of the scored categories, rounded to one decimal, computed with `node -e`; every category `N/A` → `Overall: N/A`.

## Score table

```text
| Category | Score (1-5) | Basis |
| --- | --- | --- |
| Frontmatter | 5 | 0 fail of 9 checked |
| Structure and location | 5 | 0 fail of 5 checked |
| Prompt quality | 4 | 1 fail (P4) of 8 checked |
| Tools and permissions | 5 | 0 fail of 7 checked |
| Testing | N/A | all not checked |

Overall: 4.8/5
```
