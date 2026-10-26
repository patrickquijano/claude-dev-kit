# Naming

The weighted question that proposes a skill's name. Ask it in create; in update and improve only when the current name breaks a hard rule or the user asks to rename (a rename moves the folder and breaks `/name` callers). The user's choice wins.

## Contents

- Candidates · Hard rules · Criteria · Scoring · Question

## Candidates

- 2–4, each from a different source so no one source dominates: the user's (or current) name, the job's words, the closest sibling convention in the scope, the user's trigger or domain words.
- Gather evidence read-only first: Glob the scope's skills dir for sibling names, Grep the purpose words.

## Hard rules

From `rules.md` F1. A candidate that fails one is dropped and listed with the rule, never scored.

- kebab-case a–z and 0–9, at most 64 characters, no leading, trailing, or double hyphen.
- No "anthropic" or "claude".
- Equals the folder name.
- Not already used at the target scope.

## Criteria

Weights sum to 100.

| Criterion                                             | Weight |
| ----------------------------------------------------- | ------ |
| Names the action: verb first, then the object         | 30     |
| Matches the trigger words the user gave               | 25     |
| Fits the sibling convention (cite siblings; none → 1) | 20     |
| Distinct from siblings and built-in commands          | 15     |
| Short to type: fewest words that still name the job   | 10     |

## Scoring

- Score each candidate 0, 1, or 2 per criterion: 2 fits, 0 fights.
- Cite evidence for every score: a sibling name, a `file:line`, a user quote, or a bundled fact. No evidence → score 1 and say so.
- Weighted total = Σ(weight × score / 2). The highest total is Recommended.
- Unbiased: same criteria and evidence for every candidate; never raise a score for its source (the user's name gets no bonus, the skill's own pick none either).
- A tie goes to the user's or current name, else the shorter.
- Facts come from the bundled snapshot; a web re-check is optional, never required.

## Question

- One AskUserQuestion with the Recommended name first, a one-line reason, and both top totals.
- Each option's `preview` holds its breakdown: criterion, weight, score, evidence.
- Other → run the hard-rule check, score it the same way, and show the question once more.
- Record the name; the rubric's F1 scores against it. Without AskUserQuestion, ask in plain text with the same table.
