# PHP

## Detect

`composer.json`, `composer.lock`; `artisan` signals Laravel.

## Cache

- Key: `files: [composer.lock]` (key from the lockfile); paths: `.composer-cache` (set `COMPOSER_CACHE_DIR`); `vendor` only for jobs that cannot reinstall.
- Policy: `pull-push` (the default, not written) on the install or build job; `policy: pull` on every job that only reads the cache.

## Test and reports

- Test: `vendor/bin/phpunit` or `php artisan test`.
- Coverage: PHPUnit `--coverage-cobertura` (needs a coverage driver in the image).
- Report types: `artifacts:reports:junit` for test results; `artifacts:reports:coverage_report` for coverage; `sast` and `dependency_scanning` when enabled. Set `expire_in` on each.

## Image

Image family `php` (`cli` variants) or `composer`. Match `require.php` in `composer.json`, then resolve the full tag; add extensions the project requires.

## Deploy

Deploy on the default branch or tags with an `environment`.
