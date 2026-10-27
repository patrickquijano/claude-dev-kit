# Python

## Detect

`pyproject.toml`, `requirements*.txt`, `Pipfile`, `poetry.lock`, `uv.lock`.

## Cache

- Key: `files: [poetry.lock]` (key from the lockfile); paths: `.cache/pip`, or the uv or poetry cache directory; a virtualenv only when the install step is slow.
- Policy: `pull-push` (the default, not written) on the install or build job; `policy: pull` on every job that only reads the cache.

## Test and reports

- Test: `pytest`, or the command in the project config.
- Coverage: `pytest --cov` with Cobertura XML output.
- Report types: `artifacts:reports:junit` for test results; `artifacts:reports:coverage_report` for coverage; `sast` and `dependency_scanning` when enabled. Set `expire_in` on each.

## Image

Image family `python`; variant `slim` (Alpine breaks many wheels). Match `requires-python`, then resolve the full tag.

## Deploy

Packages: publish on tags only. Services: an `environment` per target.
