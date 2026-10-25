# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `/cdk:merge-github-pull-request` merges one GitHub pull request through the GitHub MCP server, with `gh` only where MCP lacks a step. It asks the merge method (squash recommended) and whether to delete the branch before merging, then verifies the merge commit. An admin bypass is offered only for your own PRs, with `ADMIN` permission, after you confirm.
- `/cdk:review-github-pull-request` reviews one GitHub pull request on its own: it resolves addressed threads, analyzes in parallel, and posts one review pinned to the head SHA without asking for confirmation.
- `/cdk:push-commits` pushes the current branch's pending commits to its origin branch with one normal push after you confirm (flags unsigned, fixup, and behind-remote commits); it stops with the reason when none are pending, on a protected branch, or on a detached HEAD.
- `/cdk:address-github-pull-request-review` addresses a GitHub pull request's open review threads, change requests, and failing checks: it triages each item, fixes the valid ones with tests in one commit per item, pushes once, and replies on each addressed thread with the short SHA. It never force-pushes or resolves threads, and `--dry-run` prints the push and replies instead of running them.

### Changed

- `/cdk:update-changelog`, `/cdk:update-editorconfig`, `/cdk:update-readme`, and `/cdk:update-rules` ask once (Proceed, Revise, or Stop) before they write; `/cdk:update-gitignore` shows the exact lines it appends and adds a reason to its existing ask.
- `/cdk:build-docker-compose`, `/cdk:build-dockerfile`, `/cdk:build-github-workflows`, `/cdk:build-subagent`, `/cdk:build-skill`, and `/cdk:upgrade-dependencies` enter plan mode after their pre-flight check; you approve the write with the plan.
- `/cdk:commit-changes` asks you to confirm the plan (Commit, Regroup, or Stop) before committing; unattended runs stop and report the plan.
- `/cdk:build-skill` builds standalone skills (no other skill invoked, every subagent spawn has an inline fallback), asks a weighted invocation question every run with a score preview per option, and scores the result with `cdk:rubric-scorer` against a 100-point rubric, fixing inline until 100/100 or a stall (at most 10 rounds). Each fix round enters plan mode for approval before editing, and it always rescores afterward.
- `cdk:rubric-scorer` reads the `/cdk:build-skill` rules reference and rubric for a skill, takes the invocation choice as input, and reports the pass mark from the rubric.
- **Breaking:** `/cdk:scan-sonarqube` is renamed `/cdk:setup-local-sonarqube` and is setup-only. It writes `compose.sonar.yaml` (pinned SonarQube Community Build; for a supported stack, a `scan`-profile scanner service that waits for the server's healthcheck and reads `.env.sonar`) and merges `sonar: start`, `sonar: stop`, and `sonar: scan` tasks into `.vscode/tasks.json`. The scan, fix, and teardown loop is gone; an unsupported stack gets a server-only file and a researched approach. An existing file is never overwritten without your choice.
- `/cdk:setup-local-sonarqube` also configures the server: it starts it only when needed, sets the admin password, creates the project, rotates an analysis token, writes `SONAR_HOST_URL`, `SONAR_TOKEN`, and `SONAR_ADMIN_PASSWORD` to `.env.sonar` (mode 600, added to `.gitignore`), and stops the server again. `sonar: scan` no longer prompts for a token; `sonar: start` waits until the server is healthy. Maven and Gradle scans use `./mvnw` or `./gradlew` when the wrapper is tracked, the CLI scanner scans the repo in place, and image tags come from Docker Hub's documented tags endpoint (the highest of all listed tags).
- `cdk:version-resolver` accepts `pin: sha | tag` and finds a project's lockfile or manifest with Glob.
- `/cdk:implement-goal` is renamed `/cdk:implement-spec`, with the title "Implement Spec" and a description that now says "implement a spec". Use the new name; the old one no longer exists.
- `cdk:plan-implementer` drops the unused `review-group` kind and its `kind` input; `/cdk:implement-spec` now reports its unmet self-check criteria.
- `cdk:format-lint-analyzer`'s description now says when to delegate.
- The `cdk:plan-implementer`, `cdk:version-resolver`, `cdk:change-analyzer`, and `cdk:rubric-improver` descriptions now name when to delegate.
- `cdk:version-resolver` no longer returns the unused `Stack` line for dependencies.
- `cdk:change-verifier` now runs on opus.
- `cdk:change-analyzer` and `cdk:conflict-analyzer` no longer have Glob.
- The `cdk:rubric-scorer`, `cdk:practices-reviewer`, and `cdk:rubric-improver` descriptions now say when to delegate.
- `/cdk:build-github-workflows` asks whether to pin actions by commit SHA when the repo or org requires it.
- `/cdk:commit-changes` no longer pushes; it only commits, and the push is a separate step.
- `/cdk:setup-devcontainer` and `/cdk:assess-spec-kit-idea` now print `Next:` or `Open:` hints instead of chaining another skill.
- Every skill except `/cdk:draft-prompt` is explicit-only (`disable-model-invocation: true`), so no skill invokes another.
- Dead `Next:` hints and "chained by" notes are removed from the remaining skills.
- `/cdk:build-skill` is self-contained and runs only when you invoke it: it uses only `cdk:task-worker`, for read-only audits of many skills, and no longer uses the 100-point rubric, or `skill-creator`, and it names no other skill. It gains a fit gate (skill, subagent, `context: fork`, or not a skill), one `references/rules.md`, an `assets/SKILL.template.md`, and routing evals.
- `/cdk:build-dockerfile` and `/cdk:build-docker-compose` resolve Docker Hub tags through the new `images` kind of `cdk:version-resolver`.
- `/cdk:build-subagent` scores with `cdk:rubric-scorer`.
- The skill checker is renamed `validate-skill.mjs`, drops `--allow`, and also flags first or second person descriptions, nested references, reserved folders, parent or absolute paths, unmarked Claude Code-only keys, `agent` without `context: fork`, `context: fork` without `background`, side-effect tools without `disable-model-invocation`, and time-sensitive text.
- `/cdk:build-docker-compose` review mode now picks the plain or Swarm checks without asking and never fixes the file or runs `dclint-fix`; renaming `docker-compose.yml` is a named `compose-rename` command, and `node --version`, `npm view dclint version`, and `git mv` are pre-approved.
- `/cdk:build-dockerfile` prints a `Purpose:` line and defines the throwaway test tag; `/cdk:build-dockerfile` and `/cdk:build-github-workflows` no longer allow spawning `cdk:plan-implementer`, and the workflows skill drops the undeclared `--auto` and `--yes` flags.
- `/cdk:assess-spec-kit-idea` separates "no AskUserQuestion but a user can reply" from "no one can answer" and drops the never-emitted `nothing-to-do` result.
- `/cdk:build-subagent` runs its delegation test through a named `delegation-test` command, with `claude --print` pre-approved.
- `/cdk:build-subagent` accepts the `Question:` contract for a missing input and single-domain agents with a `kind` switch.
- `cdk:task-worker` has a narrower description: multi-step read-only investigations that no `cdk:codebase-explorer` kind covers.
- Ten agents no longer invite auto-delegation: `cdk:change-analyzer`, `cdk:conflict-analyzer`, `cdk:format-lint-analyzer`, `cdk:plan-implementer`, `cdk:practices-reviewer`, `cdk:repo-analyzer`, `cdk:rubric-improver`, `cdk:rubric-scorer`, `cdk:speckit-open-items-analyzer`, and `cdk:version-resolver`. They run when a skill or you name them.
- `cdk:change-analyzer` returns `Question:` for missing input instead of `Questions:`.
- `/cdk:draft-prompt` drafts a prompt with Context, Task, Constraints, Done when, and Guardrails sections, turns a bug report into a read-only investigation first, and no longer spawns a subagent.
- `/cdk:build-subagent` writes nothing until you confirm its brief, backs up an agent file before editing it, and stops when the target is not a subagent unless you choose to build anyway.
- `/cdk:build-github-workflows` and `/cdk:build-docker-compose` print the files and ask once before writing them.
- `/cdk:setup-git` confirms before initializing a repo, turning on signing by default, and writing `.gitignore`.
- `/cdk:setup-format-lint` confirms once before it installs tools and writes configs.
- `/cdk:create-github-release` creates the tag only when it does not exist locally and pushes it only when the remote lacks it.
- `/cdk:rebase-onto` asks for permission before aborting a rebase; `git rebase --abort` is no longer pre-approved.
- `/cdk:update-changelog`, `/cdk:update-editorconfig`, `/cdk:update-gitignore`, `/cdk:update-readme`, `/cdk:update-rules`, `/cdk:build-docker-compose`, `/cdk:build-dockerfile`, `/cdk:build-github-workflows`, and `/cdk:upgrade-dependencies` fall back to doing the work inline when a subagent is unavailable, and stop with a named `Result:` and `Stopped:` when `Write` is unavailable, a scorer return is malformed, or a verify cap is hit.
- `/cdk:upgrade-dependencies` no longer asks about each major twice in plan mode (the plan edit replaces the question), and its step 11 retries only reverted packages.
- `/cdk:build-skill` handles a declined or rejected plan: it asks Apply, Skip item, or Stop when plan mode was declined, revises and re-submits up to three times when the plan is rejected, and stops with `cannot interact` when nobody can answer.
- `/cdk:build-subagent` no longer writes the docs snapshot before you approve the plan, and asks once before a score-loop edit outside the Brief.
- `/cdk:build-docker-compose`, `/cdk:build-dockerfile`, and `/cdk:build-github-workflows` print the plan and ask you to leave plan mode when `ExitPlanMode` is unavailable.
- `/cdk:build-docker-compose` recommends log rotation and `x-` anchors; `/cdk:build-dockerfile` recommends `RUN --network=none` and SBOM and provenance build flags; `/cdk:build-github-workflows` recommends `actions/attest-build-provenance` and Dependabot `groups`.
- `/cdk:update-changelog` runs on all history or the last 50 commits with a defined commit range, and `/cdk:update-rules` deletes a tracked file with `git rm` after you answer Delete.
- `/cdk:build-skill` scores an improve run before plan mode and stops with `nothing-to-do` at 100/100, and it writes evals to the target skill's `references/evals.md`.
- `/cdk:build-subagent` lists fields above your Claude Code version under `Unverified` and skips `validate-agents` below v2.1.233.

### Removed

- The unused `cr-summary` mode of `cdk:change-analyzer`.
- Skills `/cdk:bump-version`, `/cdk:prepare-change-request`, `/cdk:review-change-request`, `/cdk:review-local-changes`, `/cdk:address-change-request-review`, `/cdk:ship-release`, `/cdk:setup-permissions`, `/cdk:debug-issue`, `/cdk:setup-testing`, `/cdk:scan-vulnerabilities`, `/cdk:add-unit-tests`, `/cdk:add-integration-tests`, `/cdk:add-e2e-tests`, `/cdk:setup-project`, and the project skill `prepare-release`.
- Agents `cdk:cr-reviewer`, `cdk:cr-feedback-analyzer`, and `cdk:security-scanner`, and the `tests` kind of `cdk:repo-analyzer`.
- The release gate in the pull request skills; the `release-check` CI job, `scripts/release-check.mjs`, and `.claude/release-policy.json`.

## [0.4.1] - 2026-10-24

### Changed

- Skills that spawn subagents now give each one a complete brief, and a subagent with missing or ambiguous input returns `Question:` instead of guessing.
- Skills call the GitHub and GitLab MCP tools before the `gh` and `glab` commands, and fall back to the commands when the server is unavailable.
- `cdk:version-resolver` looks up GitHub releases and tags through MCP first, then falls back to `gh api`.
- `/cdk:review-change-request` resolves any open thread, whatever its author, once a later commit fixes it, the explanation is accepted, or the code is gone, and replies to it (own threads only under `--yes`). Its `Threads resolved` line splits fixed, accepted, and obsolete and counts others' threads, and a thread that still needs addressing requests changes and blocks the merge.
- `/cdk:address-change-request-review` posts each fix reply right after the push, as a short "Fixed in <sha>" note, and asks only about the other replies.
- `/cdk:update-changelog` enforces the strict Keep a Changelog format: exact header, SemVer line, link references, and no bold prefixes.

## [0.4.0] - 2026-10-24

### Added

- `/cdk:build-docker-compose` writes, improves, or reviews a Docker Compose file for plain Compose or a Swarm stack: `compose.yaml` or `compose.<scope>.yaml`, long syntax, exact-tag images found on Docker Hub, no secret values. It validates with `docker compose config` or `docker stack config` and lints with `dclint`, and never starts containers.
- `/cdk:scan-sonarqube [max-iterations=<n>] [--yes]` sets up SonarQube Community Build and its scanner in Docker, scans the repo (Maven, Gradle, or the CLI scanner), fixes issues through `cdk:plan-implementer` and `cdk:change-verifier`, and rescans until clean (default 3 iterations, range 1–5). The repo is mounted read-only, no `NOSONAR` suppressions are added, nothing is committed, and the container, network, and volumes are removed at the end.

### Changed

- `/cdk:setup-editorconfig` is renamed `/cdk:update-editorconfig`. Use the new name; the old one no longer exists. It now writes only the properties that differ from `[*]` per file type, groups types with identical properties, removes a stale section and its comment, and reports removals on a new `Removed:` line.
- `/cdk:update-project-instructions` is renamed `/cdk:update-rules`. Use the new name; the old one no longer exists. Arguments and output are unchanged.
- `/cdk:build-dockerfile` pins base images by exact tag only (no digests), requires a default on every `ARG`, researches the vendor's official install method, and test-builds the default target to a throwaway tag to compare the image's user and exposed ports with the plan before removing it. hadolint runs on every Dockerfile when installed.
- `/cdk:build-github-workflows` pins actions by exact `vX.Y.Z` tag only; hash pinning required by a repo or org is reported under `Open:` instead of applied. Steps repeated in two or more jobs move to composite actions under `.github/actions/<name>/`, and `act -n` validates the result when `act` and Docker exist.
- `/cdk:setup-devcontainer` now smoke-tests the config with `devcontainer up` and `devcontainer exec true` (the labelled container is always removed), runs `shellcheck` on `init-firewall.sh`, always sets `workspaceFolder` to `/workspaces/${localWorkspaceFolderBasename}`, and asks which host VS Code extensions to include.
- `/cdk:setup-format-lint` writes only non-default config keys, uses markdownlint-cli2 alone for Markdown (no Prettier), and adds `*.md` and `*.markdown` to `.prettierignore` when Prettier runs beside it.
- `cdk:version-resolver` returns exact tags (`ref | tag | source | note`) with no SHA or digest, `cdk:repo-analyzer` reports a required SHA-pinning policy as a warning only, and `cdk:practices-reviewer` flags an `ARG` without a default and also checks composite actions.
- Skill rubric B3 now exempts cited facts and `Required` items, and each deduction must quote the `file:line` it names, so rescoring a skill no longer picks a new target each time.

### Fixed

- The plan-mode prompt hook now also gates namespaced plugin skills such as `/cdk:build-skill`; built-in slash commands (`/compact`) and `!` shell prompts are still skipped.

## [0.3.0] - 2026-10-23

### Added

- `/cdk:update-gitignore` explores the repo, through `cdk:repo-analyzer` (kind `gitignore`), for generated, local, and secret paths that should not be committed, reports each with its evidence and confidence, and appends the ones you approve to the root `.gitignore`. It skips paths already ignored, never reads `.env*` contents, and never untracks, commits, or pushes; tracked files that match are only reported.
- `/cdk:publish-github-release` publishes a draft GitHub release: it finds the drafts (several → you pick one, or `--tag <tag>` names it) or drafts a new one from the latest `CHANGELOG.md` section (the `--tag` version's section with `--tag`), then asks the action (publish or keep as draft), latest or pre-release, whether to replace the draft's notes with the changelog section, an optional discussion category, and, for an Action repo, whether to list it on the GitHub Marketplace (a web-only step, so on Yes it keeps the release a draft and hands you its link to publish from the browser). The tag must already exist on `origin`; the skill never creates a tag, never edits a published release, and never forces (`--yes` publishes the lone draft with the defaults).
- `/cdk:setup-format-lint` covers TOML (Taplo), GitHub Actions workflows (actionlint), SQL (SQLFluff), Terraform (`terraform fmt`, TFLint), Rust (rustfmt, Clippy), Ruby (RuboCop), Java (google-java-format, Checkstyle), Kotlin (ktlint), Swift (SwiftFormat, SwiftLint), Vue and Svelte (Prettier, ESLint plugins), C and C++ (clang-format, clang-tidy), Lua (StyLua, Luacheck), Bats files (shfmt, ShellCheck), and mypy as an optional Python linter.

### Changed

- Every subagent now sets `effort` (`low` for `format-lint-analyzer` and `repo-analyzer`, `high` for `change-verifier` and `cr-reviewer`, `xhigh` for `conflict-analyzer`, `medium` for the rest), and `check-agent` warns (A5) when `model` or `effort` is missing. `rubric-scorer` and `rubric-improver` now cover `effort`.
- Subagent hardening: `change-analyzer` never reads `.env*` or key file contents and also reads staged changes; `conflict-analyzer` caps its log read; `security-scanner` guards its `rm -rf` of the raw path; `repo-analyzer` runs its `readme` and `workflows` git commands with `-C <root>`; `conflict-analyzer`, `security-scanner`, and `speckit-open-items-analyzer` document their `Question:` Return line; and `speckit-open-items-analyzer` puts its inputs in Task step 1 and its missing-input step after Self-check.
- Skills no longer spawn the built-in `Explore` or `general-purpose` agents: new read-only `cdk:codebase-explorer` (kinds `locate`, `hypothesis`, `facts`, `leftovers`, `triage`) and `cdk:task-worker` agents with fixed `## Return` blocks replace them, `/cdk:debug-issue`, `/cdk:build-subagent`, `/cdk:implement-goal`, `/cdk:draft-prompt`, `/cdk:upgrade-dependencies`, and `/cdk:scan-vulnerabilities` call the explorer, and every skill's Efficiency line names the cdk agents. `check-skill` warns when a skill body spawns either built-in.
- `/cdk:setup-format-lint` now writes every ignore path that exists to each tool's own ignore config, including `node_modules/`, instead of skipping tools that inherit `.gitignore` or skip a path by default; new configs no longer enable `.gitignore` inheritance.
- `/cdk:setup-format-lint` writes matching yamlfmt and yamllint configs (indent, document start, comment padding, sequence indent, line endings) and turns YAML line length off in both; a kept config that conflicts or sets a line limit is listed under `Open:`.
- `/cdk:implement-requirement` is renamed `/cdk:implement-goal`, with the title "Implement Goal" and a description that now says "implement a goal". Use the new name; the old one no longer exists.
- The role-specific subagents are merged into 15 agents that take a `kind` or `role` input, with no stubs left under the old names. Update any direct use of the old names:
  - `cdk:repo-analyzer` replaces the devcontainer, gitignore, permission, project-instruction, readme, test-gap, and workflow analyzers.
  - `cdk:rubric-scorer` and `cdk:rubric-improver` replace the per-kind (agent, skill, readme, project-instruction) scorers and improvers.
  - `cdk:cr-reviewer` replaces the five `cr-*-reviewer` agents (`correctness`, `tests`, `security`, `maintainability`, `docs`).
  - `cdk:practices-reviewer` replaces the Dockerfile and workflow reviewers.
  - `cdk:version-resolver` replaces `cdk:actions-version-resolver` and `cdk:dependency-analyzer`.
  - `cdk:cr-feedback-analyzer` replaces the feedback collector, planner, and replier.
  - `cdk:plan-implementer` and `cdk:change-verifier` replace the feedback implementer and verifier and the requirement implementer and verifier.
- `/cdk:implement-goal` now implements through `cdk:plan-implementer` and reviews and tests through `cdk:change-verifier` (`goals`); findings and failed checks go back to the implementer as a fix list, then a fresh verifier run, up to the existing fix cap.
- `/cdk:build-agent` is renamed `/cdk:build-subagent`. Use the new name; the old one no longer exists.
- Working-discipline directives (rigor and efficiency) are added to all skills, subagents, and project rules, and to the `build-skill` and `build-subagent` templates and style rules.
- The README title now reads `CDK`.
- `/cdk:commit-changes`, `/cdk:switch-branch`, `/cdk:add-unit-tests`, and `/cdk:setup-spec-kit` ask before a destructive step (unstaging a split, moving or rewriting existing tests, a `--force` init in a non-empty project); unattended runs keep the old behavior or skip the step and report it under `Open:`.
- `/cdk:review-local-changes`, `/cdk:update-changelog`, `/cdk:build-dockerfile`, and `/cdk:draft-prompt` list leftovers on an `Open:` line before `Result:`; `/cdk:draft-prompt` renames `Open gaps:` to `Open:`. `/cdk:publish-github-release` and `/cdk:setup-testing` state their `--yes` behavior, and `/cdk:setup-testing`, `/cdk:scan-vulnerabilities`, and `/cdk:add-integration-tests` list `[--yes]` in `argument-hint`.
- Context-heavy skill steps now run in subagents that return compact results, so the main conversation stays lean: `/cdk:debug-issue` (hypothesis probes and verification), `/cdk:review-local-changes` (fixes and checks), the direct review in `/cdk:prepare-change-request` and `/cdk:review-change-request` (checks), `/cdk:upgrade-dependencies` (migration research, baseline and validation checks, leftovers), `/cdk:rebase-onto` (one conflict analyzer per conflicted file), `/cdk:scan-vulnerabilities` (finding triage), the `/cdk:add-unit-tests`, `/cdk:add-integration-tests`, and `/cdk:add-e2e-tests` practices lookup, `/cdk:build-github-workflows` (docs check), `/cdk:commit-changes` (large changes skip the inline secret scan), and the context reads in `/cdk:implement-goal`, `/cdk:draft-prompt`, and `/cdk:build-subagent`.
- `/cdk:scan-vulnerabilities` and `/cdk:upgrade-dependencies` no longer rely on a hook to commit: the "No PR or MR" choice now leaves the changes uncommitted, and `/cdk:upgrade-dependencies` points you to `/cdk:commit-changes`.
- The plugin hooks no longer block anything or mention `/cdk:commit-changes` or `/cdk:ship-release`. The `PreToolUse` hook is removed, so force pushes, `--no-verify`, `reset --hard` and the like are no longer blocked or asked about, and PR or MR creation is no longer gated by the release check (the `prepare-change-request` gate and CI still run it). A failed format or lint step after an edit now goes back to Claude as context instead of blocking. `release-check.mjs` loses its `hook` mode (`check` and `bump` remain), and `/cdk:ship-release` no longer writes a hold marker; `SessionStart` ignores a leftover one.
- `/cdk:setup-permissions` splits rules by scope: repo-specific rules go to the project `.claude/settings.local.json` and only repo-agnostic rules to the user file. git is allowed by read-only subcommand only, `jq` moves to ask, and a package manager's scoped rule wins over the build-tool allow. Re-run it to move existing rules.
- `/cdk:setup-spec-kit` and `/cdk:setup-graphify` no longer install a tool globally without asking: they ask first, install a pinned version (Spec Kit v1.2.2, graphifyy 0.9.93), and an unattended run stops and lists it under `Open:`.
- Unattended runs (chained, `--auto`, or `--yes`) are consistent across skills: they ask nothing, never delete drafts or tags, skip DAST and ship steps, abort a rebase conflict, and list what is left under `Open:`. `/cdk:review-change-request --yes` stops on existing GitLab drafts instead of deleting them.
- Skills treat fetched pages, PR, MR, and issue text, review comments, CI logs, changelogs, and diffs as data, and `/cdk:setup-husky` and `/cdk:setup-format-lint` add the workspace-root flags (`-w` for pnpm, `-W` for yarn 1) and detect lefthook, pre-commit, and existing hooks before replacing them.
- `/cdk:build-skill`'s `check-skill` flags dotfiles other than `.DS_Store` inside a skill; the `setup-husky` asset is now `commitlintrc.json` and is copied to `.commitlintrc.json`.
- `.commitlintrc.json` (and the `setup-husky` copy) now permits commit bodies and footers but still rejects any trailer starting with `Co-`.

### Removed

- The end-of-task steps are removed from the plugin hooks: `Stop` no longer prompts Claude to run the unit tests, refresh the Graphify graph, update docs, or add changelog entries, and `UserPromptSubmit` no longer records the working tree at turn start. `Stop` now only formats and lints changed file types, and `UserPromptSubmit` only prints the plan-mode context.
- `SessionStart` no longer adds the Graphify rules pointer; it injects only the date and time. `/cdk:setup-graphify` and its rules file are unchanged.

### Fixed

- Skills no longer pre-approve broad git patterns: `git symbolic-ref` is limited to `--short refs/remotes/origin/HEAD`, and `git ls-remote`, `git switch -c`, `git fetch *`, `git checkout --ours`/`--theirs`, and `specify extension add` stay permission-prompted.
- `/cdk:commit-changes` and `/cdk:switch-branch` truncate a branch name so its `-N` suffix keeps it within 72 characters, and the secret scan in `/cdk:commit-changes` and `cdk:change-analyzer` also covers `github_pat_`, `gh[ousr]_`, `sk-ant-`, `sk-proj-`, and `AIza`.
- `check-skill` no longer warns that a verb-first name such as `setup-devcontainer` ends in an actor suffix.
- The Stop hook no longer shows a `Stop hook error` notice: repo lint failures now reach Claude as `Stop hook feedback`, and a Stop hook crash prints a `cdk stop: …` message and exits 0 instead of exiting 1.
- Skills run cleanup for what they start (`docker compose down -v` with pinned images, the e2e app server, scan scratch and checkpoints), use shell-safe single-quoted PR and MR titles, a file or unique-delimiter MR description, and keep their `commands.md` tables complete, with `Open:` replacing `Gaps:` in build outputs.
- `/cdk:ship-release` caps check polling at 10 minutes, and `/cdk:commit-changes` treats `git diff --no-index` exit 1 as success; `/cdk:create-github-release` and `/cdk:publish-tag` use the default branch instead of a hard-coded `main`.

## [0.2.0] - 2026-10-20

### Added

- `cdk:skill-improver` and `cdk:agent-improver` agents work through every check error, deduction, and warning thoroughly, with a proactive sweep, editing only the target skill directory or agent file.
- `/cdk:implement-requirement` takes a requirement, spec file, or issue text and carries it to a validated change: it offers plan mode first, asks clarifying questions, sets goals with acceptance criteria, compares approaches (you pick one, or `--yes` takes the recommended one), implements with tests, and runs the project's documented checks, fixing errors and warnings and looping back to the goals for up to 3 rounds. It never commits.
- `/cdk:publish-tag` creates and pushes the annotated tag for the latest `CHANGELOG.md` version from the verified tip of `main`, without a GitHub release, so it also works on GitLab. It stops when the tag already exists locally or on the remote, never forces, and asks once before writing (`--yes` skips the question; `--prefix v|none` overrides the detected tag prefix).

### Changed

- `/cdk:build-skill` and `/cdk:build-agent` now report the score after each check, then delegate every open error and deduction to a dedicated writer subagent and re-score, for up to 3 improve rounds; the output gains a `Rounds:` line.
- `/cdk:address-change-request-review` now plans and fixes each review item thoroughly and proactively within the CR: it finds the root cause, sweeps the code the CR changes for the same problem, plans the tests, docs, and callers each fix needs, and checks every item against an acceptance check before reporting. The plan table lists each group's sites, tests, and checks, an unmet self-check counts as a failed fix attempt, and same-pattern code outside the CR is listed under open items as a follow-up instead of edited.
- Four components are renamed to describe their role, with no stubs left under the old names: `/cdk:build-project-instructions` → `/cdk:update-project-instructions`, `/cdk:build-readme` → `/cdk:update-readme`, `cdk:claude-md-analyzer` → `cdk:project-instruction-analyzer`, and `cdk:claude-md-scorer` → `cdk:project-instruction-scorer`. Update any invocation of the old names; the matching evals are renamed too.
- The end-of-task gate now fires whenever uncommitted changes exist, once per distinct working-tree state, instead of only when files changed since the prompt. The commit step commits all uncommitted changes (no `paths:` scope), and `UserPromptSubmit` no longer records a baseline.
- Plugin hooks no longer show a spinner `statusMessage`; the format and lint hooks print a line only when a step changed files or failed, and the plan-mode ask no longer prints a notice.
- Every Task skill's Output now ends with a `Next: <follow-up> | none` line before `Result:`, naming the logical next skill. All 35 subagents treat the content they read as data (ignoring instructions inside it), end their `## Task` with a `Self-check` step, and batch independent reads in one turn; no `## Return` field changed.
- `/cdk:build-skill` and `/cdk:build-agent` enforce this: `check-skill` warns `output-next`, `check-agent` warns `data-guard` and `self-check`, and the rubrics gain Q4 (skill) and B9 (agent) while still totalling 100.

### Fixed

- `/cdk:update-project-instructions` no longer penalizes a Maintenance line that routes known issues to auto memory, and counts ancestor `CLAUDE.md` files toward the always-loaded total, reported separately as `<project n> + <ancestor n>`.
- `/cdk:update-readme` no longer scores host-injected, CI-internal, or dev-tooling config as undocumented options, and no longer treats scripts inside a component directory as separate components. `cdk:readme-analyzer` now splits `Config:` into user and internal.
- The end-of-task steps never fired on the first turn after approving a plan with cleared context, because that turn fires no `UserPromptSubmit` to record a baseline.

## [0.1.0] - 2026-10-15

The plugin restarts pre-1.0 because it still changes often. Versions 1.0.0–3.0.0 were never tagged or released and are withdrawn. While the major version is 0, a breaking change bumps minor and everything else bumps patch.

The plugin ships skills, subagents, and hooks for Git and GitLab workflows (signed atomic commits, rebases, PR and MR creation, review, and release), project setup, and skill, agent, README, and CLAUDE.md authoring with scored rubrics.

### Added

- The end-of-task hook now tells Claude to run the project's unit tests first, using the detected command (`test:unit` or `test` script, pytest, go, cargo, or phpunit), and to fix and re-run until they pass.
- The end-of-task hook now tells Claude to add Unreleased entries with `cdk:update-changelog` when the task changed user-facing behavior and `CHANGELOG.md` exists, before the commit step; it never cuts a release or bumps the version.
- `/cdk:build-skill` is rebuilt as a companion to `skill-creator`: it asks the scope (personal, project, or plugin) and kind (reference, task, or background-only) with a reasoned recommendation, hands the draft to `skill-creator` under bundled frontmatter and body rules (and stops with install steps when `skill-creator` is missing), then scores it against a 100-point rubric (pass at 95) and fixes deductions for up to 3 rounds. Orchestrator and subagent building is dropped; use `/cdk:build-agent` for subagents.
- `cdk:skill-scorer` agent scores a skill directory against the `build-skill` rubric.
- `/cdk:build-skill` now runs a self-contained check script (`scripts/check-skill.mjs`) for the mechanical skill rules (frontmatter, size, layout, links, injection fallbacks, Output) and passes its JSON to `cdk:skill-scorer`. It names skills by their action, keeps each skill to one job (asking Split, Pick one, or Stop when it finds several), and requires a `## Files` navigation section; the rubric adds F8, B9, B10, and Q3 and stays at 100 points.
- `/cdk:build-agent` is rebuilt the same way as `/cdk:build-skill`: self-contained, it asks scope, checks fit and one job, interviews only for what the agent needs, drafts under bundled frontmatter and body rules, runs a check script (`scripts/check-agent.mjs`), and scores with the new `cdk:agent-scorer` against a 100-point rubric (pass at 95) for up to 3 fix rounds. It reads the spawning skill's contract without editing it, lists mismatches under `Gaps:`, and writes only the agent file.
- `/cdk:build-agent` now names agents as actors, never actions (`code-reviewer`, not `review-code`), asking Rename or Keep for an action name, and when it finds several jobs it asks Split, Pick one, or Stop with a recommendation and reason from a new signal table in `decide.md`; the rubric's D1 scores both.
- `/cdk:build-skill` now errors on links that leave the skill directory, so every skill it builds is standalone; its templates tell drafts to copy, never link, another skill's files.

### Changed

- The nine `write-*` skills are renamed to verb-family names, with no stubs left under the old names: `write-changelog` → `update-changelog`, `write-dockerfile` → `build-dockerfile`, `write-e2e-tests` → `add-e2e-tests`, `write-github-workflows` → `build-github-workflows`, `write-integration-tests` → `add-integration-tests`, `write-project-instructions` → `build-project-instructions`, `write-prompt` → `draft-prompt`, `write-readme` → `build-readme`, `write-unit-tests` → `add-unit-tests`. Update any `/cdk:write-*` invocation, and the matching evals are renamed too.
- While the major version is 0, `release-check` requires a minor bump for a breaking change and a patch bump for everything else; from 1.0.0 the standard SemVer levels apply. The release policy accepts a one-time `versionReset` to a lower major than the target version, and the README and release rules list what counts as breaking.
- Every plugin skill is rebuilt as standalone: no skill links another skill's files, and the never-invoked `shared` skill is gone. Skills that chain others do so through the Skill tool, and each skill carries its own trimmed copy of the rules it needs. Skills now list leftovers under `Open:` before `Result:` (replacing `Resolution:`), and the subagent template moved to `build-agent`.
- The release scripts moved into the skills that own them: `release-check.mjs` into `bump-version` and `changelog-release.mjs` into `create-github-release`; the PreToolUse hook and the release-check CI job import them from there. `cdk:prepare-change-request` and `cdk:ship-release` reach the release check by chaining `cdk:bump-version`.
- `/cdk:write-claude-md` is renamed `/cdk:build-project-instructions`, because the skill name check reserves the word "claude".
- `cdk:speckit-open-items` is renamed `cdk:speckit-open-items-analyzer`, so every analyzer is named as an actor.
- The eval `resolve-findings-reports-open` is now `setup-editorconfig-reports-open` and checks the `Open:` line.
- The end-of-task steps now come from the `Stop` hook instead of every prompt: when a turn changed files, it blocks once with the steps in order (unit tests, Graphify, README and docs, changelog, commit), so they no longer get buried in long turns, and Claude may skip them and say so when the task is unfinished and waiting on the user. The prompt hook only asks about plan mode and records the git baseline. A step is left out only when it cannot run: the changelog step needs git and a safe state (not `CHANGELOG.md`), the Graphify step needs the `graphify` binary (with a `/cdk:setup-graphify` hint when no graph exists), the docs step always runs, and a `/cdk:ship-release` run removes only the commit step.
- Every plugin subagent is rebuilt as standalone: its body carries its own rules and a fixed `## Return`, and skills pass only runtime data. The five code-review reviewers each return the full findings block (`cdk:cr-correctness-reviewer` also the `Threads:` block), `cdk:change-analyzer` carries the commit and branch conventions, and `cdk:format-lint-analyzer` carries its tool catalog; the spawning skills' spawn lines and `findings.md` files are realigned. Some agents still read reference files the calling skill passes by path at run time.

### Removed

- The `Known issue` line in every subagent return block and in the agent rules.
- `cdk:skill-auditor` agent and the old `build-agent` reference files; the check and scoring they did now live in each builder's script and scorer.

### Fixed

- `cdk:review-change-request` squash merges now use the PR or MR title as the commit subject with an empty body, so the squash commit passes commitlint instead of carrying a list of every commit subject.

[unreleased]: https://github.com/patrickquijano/claude-dev-kit/compare/v0.4.1...HEAD
[0.4.1]: https://github.com/patrickquijano/claude-dev-kit/compare/v0.4.0...v0.4.1
[0.4.0]: https://github.com/patrickquijano/claude-dev-kit/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/patrickquijano/claude-dev-kit/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/patrickquijano/claude-dev-kit/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/patrickquijano/claude-dev-kit/releases/tag/v0.1.0
