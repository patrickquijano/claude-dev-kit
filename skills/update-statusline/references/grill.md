# Grill

Read when a decision question is about to be asked. Gates (confirm, push, stop) do not use it.

## Contents

- Table · Weights · Anchors · Total · Recommend · Sensitivity · Options

## Table

Print before each question; options in alphabetical order.

| Option | <criterion> (w) | … | Total |
| ------ | --------------- | - | ----- |
| A      | 4 [url]         | … | 76    |
| B      | 3 unverified    | … | 64    |

## Weights

- 3–6 criteria taken from the user's stated goals, never from a preferred option.
- Integer weights summing to 100, fixed and printed before any option is scored.
- No stated goals → use the default criteria in `color.md`.

## Anchors

State one line per criterion for what 1, 3, and 5 mean. Every score cites a source (URL, `file:line`, user quote) or says "unverified".

| Score | Meaning                   |
| ----- | ------------------------- |
| 1     | Fails the criterion       |
| 2     | Meets it with major gaps  |
| 3     | Meets it acceptably       |
| 4     | Meets it well, minor gaps |
| 5     | Fully meets it            |

## Total

`Total = sum(weight × score) / 5`, range 20–100 (0 only when unscored).

## Recommend

- Mark Recommended only on the highest total.
- Top two ≤5 points apart → mark none and say "close call".
- The lead depends on unverified scores → say so.

## Sensitivity

For every ordered pair of criteria, move 10 weight points from one to the other (floor 0) and recompute. If the winner changes, name the shift and the new winner.

## Options

Each description states, in similar length: the total, the main advantage, and the main weakness. The Recommended option also states the strongest case against it.
