# Ruby

## Detect

`Gemfile`, `Gemfile.lock`, `.ruby-version`.

## Cache

- Key: `files: [Gemfile.lock]` (key from the lockfile); paths: `vendor/bundle` (set `BUNDLE_PATH`).
- Policy: `pull-push` (the default, not written) on the install or build job; `policy: pull` on every job that only reads the cache.

## Test and reports

- Test: `bundle exec rspec` or `bundle exec rake test`.
- Coverage: SimpleCov with a Cobertura formatter when the project has one.
- Report types: `artifacts:reports:junit` for test results; `artifacts:reports:coverage_report` for coverage; `sast` and `dependency_scanning` when enabled. Set `expire_in` on each.

## Image

Image family `ruby`; variant `slim`. Match `.ruby-version`, then resolve the full tag.

## Deploy

Deploy on the default branch or tags with an `environment`.
