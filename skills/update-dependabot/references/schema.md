# Schema

## Contents

- Check · Manual checklist · Fix loop

## Check

`uvx-check` succeeds → `schema-uvx`; else `pipx-check` → `schema-pipx`; neither → the manual checklist. The tool downloads and runs a package; the plan names it. Exit 0 = pass.

## Manual checklist

Quote the evidence for each line against the fetched options reference.

1. `version: 2` is the first key.
2. `updates` is a non-empty list.
3. Each entry has `package-ecosystem` (a listed value), a `directory` or `directories`, and `schedule.interval` (a listed value).
4. Every key is in the reference's per-update key list; none is marked removed.
5. `cooldown`, `groups`, and `commit-message` keys match the reference.
6. No two entries share an ecosystem and directory.
7. The YAML parses and uses consistent indentation.

## Fix loop

Fix only keys this run wrote or named in the plan, up to 3 rounds, each in plan mode. A failure in a user-kept key goes under `Open:` with the line.
