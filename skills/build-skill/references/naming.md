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

- Score each candidate 1–5 per criterion on the anchors in `grill.md`: 5 fits, 1 fights. The criteria above are the default criteria and their weights are fixed integers summing to 100.
- Cite evidence for every score: a sibling name, a `file:line`, a user quote, or a bundled fact. No evidence → mark it "unverified".
- Total = Σ(weight × score) / 5 (0–100). Recommended only on the highest total.
- Unbiased: same criteria and evidence for every candidate; never raise a score for its source (the user's name gets no bonus, the skill's own pick none either).
- Close call (top two ≤5 apart) → no Recommended, say "close call", and the user picks; run the sensitivity check in `grill.md`.
- Facts come from the bundled snapshot; a web re-check is optional, never required.

## Question

- Print the score table before the question, then one AskUserQuestion with the Recommended name first (none on a close call; options then alphabetical), the option descriptions per `grill.md`, and both top totals.
- Each option's `preview` holds its breakdown: criterion, weight, score, evidence.
- Other → run the hard-rule check, score it the same way, and show the question once more.
- Record the name; the rubric's F1 scores against it. Without AskUserQuestion, ask in plain text with the same table.
