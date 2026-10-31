# Repeats

Step 3 of `SKILL.md`: instructions that repeat are offered as a rule or a skill.

## Sources

Count an instruction as repeated when the same meaning appears in the input text, the input files, the existing `CLAUDE.md` and `.claude/rules/**/*.md`, or the memory files. Build on the analyzer's `duplicate` tags in the facts `Instructions` list; judge the rest from those lines.

## Thresholds

- 2 or more occurrences → a rule candidate: a standing instruction that belongs in `CLAUDE.md` or a rule file.
- 3 or more occurrences → also a skill candidate: a repeated multi-step workflow that runs as one job.
- An instruction already placed once in the right file is not a candidate; the repeat is the copies, not the rule.

## Ask

For each candidate ask once (max 4 per call): `Add rule` | `Build a skill` (only at 3 or more) | `Omit`, with the occurrence count and sources, the recommended option first.

- `Add rule` → place it per rubric `## Placement rules`, merged into step 4's draft; the duplicates are dropped.
- `Build a skill` → no skill is built here; the `Next:` line says in plain words to build a skill for the workflow, naming it and its sources.
- `Omit` → add it to `Omitted:`; never re-ask it.

## Unattended

`--yes` or no way to ask → ask nothing and write nothing for a candidate; list each under `Open:` with its count and the offered options.
