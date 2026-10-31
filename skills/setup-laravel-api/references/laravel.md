# Laravel

## Contents

- Scaffold · Data stores · Tooling · Structure · ULID · JSON:API · Index

## Scaffold

- `scratch`, `create` into it, then move files into the repo root.
- API-only per research (`artisan` `install:api`). Removing the frontend is a plan entry only (L4).
- Accept: `composer.json` requires the resolved framework version; `routes/api.php` exists.

## Data stores

- Per pick: the `require` package, the config, and `.env.example` keys (host, port, database, credentials keys with empty values).
- Cache default `database`; SQL Server needs `pdo_sqlsrv`; S3-compatible storage sets endpoint and path-style options.
- Accept: each pick's package is in `composer.json`; each key is in `.env.example`.

## Tooling

- Scalar: `require` `scalar/laravel`, `artisan` `scalar:install`, keep the `viewScalar` gate; plus the picked OpenAPI generator.
- Pint (config in `pint.json`, with the picked extra rules); the PHP CS Fixer pick.
- Boost: `artisan` `boost:install`, its Claude MCP registration, the `boost:update` `post-update-cmd`.
- Pest and `pest-plugin-laravel` replacing PHPUnit; IDE Helper as a dev dependency with its `post-update-cmd` scripts.
- Accept: `pint` and `pest` run; `route-list` shows `/scalar`.

## Structure

- The picked folder layout (Actions, Services, `Http/Controllers/Api/V1` labeled community convention).
- Accept: directories exist with a `.gitkeep` only when empty.

## ULID

- A Blueprint mixin adding `ulidPrimary()` and a precise-timestamp method, registered in a service provider.
- `Builder::defaultTimePrecision(6)` and `Schema::morphUsingUlids()` in that provider.
- `artisan` `stub:publish`, then edit the migration and model stubs to use the mixin and `HasUlids`.
- Convert the default migrations (users, sessions, tokens) per L2 and L3.
- Accept: a generated migration uses the mixin; a generated model uses `HasUlids`; migrations run on the picked SQL store or SQLite.

## JSON:API

- Responses and errors per the picked approach; every error response is a JSON:API `errors` document.
- Accept: a request to an unknown route returns `application/vnd.api+json` errors.

## Index

- `/` returns `response()->noContent()` (204); the welcome view is removed per the plan.
- Accept: `/` returns 204 with an empty body.
