# Options

## Contents

- Fixed criteria · Sources · Questions

## Fixed criteria

Default weights for every data-store or tool question:

| Criterion                          | Weight |
| ---------------------------------- | ------ |
| Official or first-party support    | 25     |
| Maintenance and community evidence | 20     |
| Fit for the stated workload        | 20     |
| Operating cost and self-hosting    | 15     |
| License                            | 10     |
| Measured performance evidence      | 10     |

The user's stated goals replace these only when they name different goals. Never bias toward a vendor.

## Sources

Every score uses the `grill.md` anchors and cites a URL or says `unverified`; license scores cite the package's license file or registry page.

## Questions

| Question          | Candidates (verify each against the research)                                                                     |
| ----------------- | ----------------------------------------------------------------------------------------------------------------- |
| SQL               | MariaDB, MySQL, PostgreSQL, SQLite, SQL Server (needs the `pdo_sqlsrv` extension)                                 |
| NoSQL             | MongoDB via the official Laravel package, DynamoDB, others the research finds                                     |
| Search Engine     | Laravel Scout with Algolia, Meilisearch, Typesense, database engine                                               |
| Cache             | database, Redis (PhpRedis or Predis), DynamoDB, Memcached, file                                                   |
| Object Storage    | S3 and S3-compatible stores through Flysystem (endpoint and path-style options), local                            |
| OpenAPI generator | Scramble, Scribe, laravel-openapi, none (Scalar recommends none; label community)                                 |
| JSON:API approach | built-in JSON:API resources plus a hand-rolled error renderer, `laravel-json-api/laravel`, `timacdonald/json-api` |
| PHP CS Fixer      | keep Pint as the only fixer with extra rules in `pint.json`, or a standalone config with non-overlapping paths    |
| Folder layout     | Actions, Services, `Http/Controllers/Api/V1` (label community convention), framework default                      |

Skip keeps the framework default or omits the piece. A pick the research cannot source is `unverified` and not applied.
