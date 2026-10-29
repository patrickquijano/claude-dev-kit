# Questions

How the skill asks about a missing or ambiguous fact. One question per round; at most 5 rounds, then the rest goes under `Open:`.

## Contents

- Options · Weights · Evidence · Recommendation · Option line

## Options

Offer 2–4 concrete options plus the free-text Other. Every question that can end the run includes a `Stop` option. Never ask what the user, the conversation, the repo, or the existing issue already states.

## Weights

Integer weights sum to 100. Score each option from the evidence that favors it: a direct user statement counts most, then repo content (template text, label descriptions, existing issue), then inference. No evidence for any option → weights stay within 5 points of each other.

## Evidence

Each option shows one evidence line and one trade-off. Evidence is cited (user message, file path, label description, issue number); a fact that could not be checked is marked "unverified". Never invent evidence to favor an option.

## Recommendation

The highest weight is Recommended, one option only, listed first and ending with `(Recommended)`. The top two within 5 points → say "close call" and recommend none. Under `--yes`, a question with a Recommended option takes it; a close call, or a required field with no source, stops the run.

## Option line

`<option> — <weight>% — <evidence>; trade-off: <cost>`. Example: `Update #12 (Recommended) — 60% — open issue #12 has the same title; trade-off: edits another person's text`.
