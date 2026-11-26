# Skill Score Rubric (1–5)

Informational only: the score never changes a result, blocks, or triggers a fix. The checklist in `checks.md` is the only gate.

## Categories

| Category           | Check IDs |
| ------------------ | --------- |
| Frontmatter        | F1–F9     |
| Structure and size | S1–S8     |
| Content quality    | Q1–Q8     |
| Scripts            | X1–X3     |
| Testing            | T1–T2     |

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
- A category whose checks are all Not checked scores `N/A` (Scripts without `scripts/`, Testing always).
- Overall = the mean of the scored categories, rounded to one decimal, computed with `node -e`; every category `N/A` → `Overall: N/A`.

## Score table

```text
| Category | Score (1-5) | Basis |
| --- | --- | --- |
| Frontmatter | 5 | 0 fail of 8 checked |
| Structure and size | 4 | 1 fail (S2) of 8 checked |
| Content quality | 5 | 0 fail of 8 checked |
| Scripts | N/A | no scripts/ |
| Testing | N/A | all not checked |

Overall: 4.7/5
```
