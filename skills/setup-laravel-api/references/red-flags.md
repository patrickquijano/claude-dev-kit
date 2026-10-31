# Red flags

Seed list for the step 14 pass; the research adds findings.

## Contents

- Seed flags · Pass

## Seed flags

| ID | Cause                                                                                             | Options to weigh                                                                                      |
| -- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| L1 | Pint and a standalone PHP CS Fixer duplicate rules                                                | Pint only with the extra rules in `pint.json`; standalone fixer with non-overlapping paths; Pint only |
| L2 | Default `sessions.user_id` (`foreignId`) breaks with ULID users                                   | Convert to `foreignUlid`; drop database sessions; keep integer users                                  |
| L3 | Sanctum `personal_access_tokens` uses `morphs`, which breaks with ULID users                      | `Schema::morphUsingUlids()` before the migration; edit the published migration; skip Sanctum          |
| L4 | The frontend (welcome view, Vite, npm steps in the composer `setup` script) remains in an API app | Remove as a plan entry; keep; leave and list under `Open:` (the docs give no removal steps)           |
| L5 | Boost edits an existing `CLAUDE.md`                                                               | Allow its own block, named in the plan; skip Boost guidelines; write elsewhere                        |
| L6 | JSON:API errors undocumented for the built-in resources                                           | Hand-rolled `withExceptions()` renderer; `laravel-json-api/laravel`; `timacdonald/json-api`           |
| L7 | A `.env` or secret could be written or printed                                                    | Keys only in `.env.example`; never open `.env`                                                        |
| L8 | `/` still renders the welcome view                                                                | `response()->noContent()`; route removal                                                              |

## Pass

1. Review the written files against this list and the research findings; add rows for anything new.
2. One table row per flag: ID, root cause, 2-3 options, the chosen one, and a one-line reason citing a URL or `unverified`.
