# Conventions

Bundled snapshot. Re-fetch the docs at step 2; offline, use this and mark it unverified.

## Contents

- Layout · Naming · Root file · Reuse · YAML scalars · POSIX sh · Setup and teardown · Defaults to omit · Sources

## Layout

```text
.gitlab-ci.yml                      thin root: stages, workflow, default, variables, include
.gitlab/ci/<job>.gitlab-ci.yml      one job per file
.gitlab/ci/<template>.gitlab-ci.yml one hidden template per file (leading dot dropped from the file name)
```

- Include with one flat glob: `include: - local: '/.gitlab/ci/*.gitlab-ci.yml'`. The docs say `**/*.yml` matches only subfolders, so a nested glob would load nothing.
- Whether a glob matches dotfiles is unverified, so a hidden template `.node-setup` lives in `node-setup.gitlab-ci.yml`.
- Only files the request changes are touched; existing jobs stay in the root until the user agrees to migrate them.

## Naming

- Job, stage, and file names: kebab-case. Hidden template: `.` plus kebab-case, held in a file without the dot.
- The file name equals the job name: job `unit-test` lives in `unit-test.gitlab-ci.yml`.
- Update mode keeps existing names (required checks and `needs` match them).

## Root file

Shape (see the root template): `stages`, `workflow:rules`, `default` (`interruptible`, shared `before_script` and `after_script` through `!reference`), `variables`, one `include`.

- Keep jobs out of the root in create mode.
- Put `variables` the whole pipeline needs at root; a variable one job needs stays in that job.

## Reuse

- YAML anchors work only inside the file that defines them (`include` merges after parsing). Never use one across files.
- Across files use `extends` (merges hashes, never arrays) or `!reference [.template, key]` (nests up to 10 levels in script sections; also works in `rules`).
- Rules shared by several jobs: a hidden template that holds `rules`, pulled in with `!reference`.
- Extract a shared template on the third use; two similar jobs stay separate.

## YAML scalars

- A command or value that fits on one line stays on one line, unquoted when YAML allows.
- Longer prose or a long single command: folded `>`.
- Multi-line shell (loops, conditionals) or text whose newlines matter: literal `|`.
- Quote only when YAML needs it (`:`, a leading `*`, `&`, `!`, `%`, `@`, a backtick, `{`, `[`, or a value that would parse as a number or boolean).

## POSIX sh

Runners may use `sh` (Alpine, BusyBox). Write commands that run there.

- Never: `[[ ]]`, arrays, `source`, `function name`, `local`, `$'...'`, `set -o pipefail`, process substitution, `==` in `[ ]`.
- Use: `set -eu`, `[ ]` with `=`, `.` for sourcing, `command -v`, `printf` over `echo -e`.
- Inline every command; a job never calls a repo script. A script that already exists → ask whether to inline it (update mode).

## Setup and teardown

- `before_script`: setup shared by every job goes in `default` and is pulled in with `!reference`; per-job setup goes in the job.
- `after_script`: runs in a new shell, so variables set in `script` are gone; runs on `script_failure` and when the job is cancelled during `before_script` or `script`; has its own default 5-minute timeout; never changes the job's exit code. Use it for cleanup, not for results.

## Defaults to omit

Set a key only when it differs from the default. Snapshot (fetch to confirm; offline → unverified):

- `cache:policy` = `pull-push`; use `pull` for jobs that only read, and set it only there.
- `cache:when` = `on_success`; set `always` only when a failed job's cache is wanted.
- `artifacts:when` = `on_success`; set `always` for test and coverage reports needed on failure.
- `artifacts:expire_in` defaults to the instance setting; set it on every report artifact so storage stays bounded.
- `interruptible`, `retry`, `timeout`, `allow_failure`, `when`: omit unless different from the default.

## Sources

- <https://docs.gitlab.com/ci/yaml/> (keywords and defaults)
- <https://docs.gitlab.com/ci/yaml/includes/> (include and globs)
- <https://docs.gitlab.com/ci/yaml/yaml_optimization/> (anchors, `extends`, `!reference`)
- <https://docs.gitlab.com/ci/lint/> (CI Lint)
