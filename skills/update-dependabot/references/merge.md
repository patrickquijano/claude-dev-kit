# Merge

## Contents

- Rules · Diff · Edge cases

## Rules

- Parse the existing file; keep top-level `version`, `registries`, `multi-ecosystem-groups`, comments, key order, and quoting style.
- For each detected ecosystem: entry exists → add only missing `directories` (an entry with a singular `directory` becomes a `directories` list holding the old value plus the new ones, and `directory` is removed); no entry → append one built from the answers.
- Keep every user-set key on an existing entry (`ignore`, `allow`, `labels`, `assignees`, `open-pull-requests-limit`, `target-branch`, `registries`). Change a key only when it is invalid or stale per the research, and name it in the plan.
- Answers apply to new entries only; an existing entry's schedule, groups, cooldown, and prefix are kept unless the user picks a different value for that question and the plan names the entry.
- Same ecosystem listed twice with the same `directory` → report under `Open:`, never merge silently.

## Diff

Show a unified diff of the file (or the full new file) in the plan. No change → `unchanged`, no write.

## Edge cases

- Empty or unparseable file → ask: stop, or replace (replace is never covered by `--yes`).
- Both `.yml` and `.yaml` → step 1 asks.
- `.yml` present → keep `.yml`; never rename.
