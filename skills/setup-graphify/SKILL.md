---
name: setup-graphify
description: Installs graphify, adds its hooks, builds the first code knowledge graph, and writes usage rules. Use only when the user explicitly asks to set up graphify or a code knowledge graph.
argument-hint: '[--yes]'
compatibility: Claude Code only. Uses disable-model-invocation and CLAUDE_SKILL_DIR; claude.ai and API uploads reject unknown frontmatter keys.
allowed-tools: Bash(command -v graphify) Bash(command -v uv) Bash(command -v pipx) Bash(graphify --version) Bash(graphify hook status) Bash(git rev-parse *) Bash(node ${CLAUDE_SKILL_DIR}/scripts/graphify-state.mjs state *)
disable-model-invocation: true
---

# Setup Graphify

Input: $ARGUMENTS (strip `--yes` first)

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `commands.md` row.

## Rules

- Ask (unattended: record) what the input and repo cannot answer.
- Flags: `--yes` runs unattended: no questions, recommended options taken, assumptions under `Open:`. Only a flag the user passed counts; never add one.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Idempotent: check each step's state first and skip what is done, so re-runs change nothing.
- Never pass `--strict` (it blocks reads until a query runs) or `--force`.
- Not pre-approved on purpose: `install-skill`, `install-claude-hooks`, `install-git-hooks`, `label-missing`, `append-ignores`. The first three write `.claude/settings.json` and `.git/hooks`; `label` spends LLM tokens and rewrites `graphify-out/`; `append-ignores` writes ignore files. The permission prompt is the second guard.
- Ignore files: append only missing entries; keep existing entries, order, and syntax form. Edit only linter and formatter configs that already exist; only `.gitignore` and `.claude/rules/graphify.md` may be created.
- Each command runs once, no retries. No fix loop: leftovers are reported, never hand-written.
- Tool-made files (`CLAUDE.md`, `.claude/settings.json`, `.claude/skills/graphify/`, `.gitattributes`) are expected; only report them. Never hand-write the `CLAUDE.md` `## graphify` section.
- Share only `graphify-out/graph.json` and `graphify-out/GRAPH_REPORT.md` (repo-relative paths, safe across machines); the rest of `graphify-out/` holds absolute paths or per-machine state.
- Pre-flight or CLI (step 2) stop → print the Output with `Stopped: <step>: <reason>` and end. Any later failure → continue with the remaining steps, list it under `Open:`, and set `Result: stopped` only when nothing more can run.
- AskUserQuestion unavailable: ask the pending question as plain text with its options, end the turn, and take the next message as the answer.
- `install-uv` and `install-pipx` are global installs, so they run only when the CLI is missing; the install is unpinned, so the package index resolves its latest stable release.
- Plan once: after the pre-flight and the state checks of steps 2-5 and before the first write (the global install, skill, hooks, graph build, `label-missing` (spends LLM tokens, rewrites names in `graphify-out/`), `.gitignore`, ignores, rules, lint and format config edits), print the plan and apply it with no wait. A file this skill did not create is never overwritten and a `.gitignore` line is never deleted: list it under `Open:`.

## Workflow

1. **Pre-flight.** Context Repo root → repo root; run every later step from it. `<none>` (not a git repo) → use the current directory, skip the git hooks in step 4 and step 7. Then print the plan per `${CLAUDE_SKILL_DIR}/references/plan.md` `## Plan`.
2. **CLI.** Install `graphifyy` unless `has-graphify` succeeds; record `version`. Flow and failures: `${CLAUDE_SKILL_DIR}/references/details.md`.
3. **Skill.** Run `state` once (the run for the plan is only a pre-check); steps 4-9 read this JSON. `skill` is `project` or `user` → skip. Else run `install-skill` (also does the Claude half of step 4).
4. **Hooks.**
   - Claude: `claudeHooks` is `true` → skip. Else run `install-claude-hooks` (adds the `## graphify` section to `CLAUDE.md` and the PreToolUse hooks).
   - Git: `hook-status` reports post-commit, post-checkout, and the merge driver installed → skip. Else run `install-git-hooks` (also adds `graphify-out/graph.json merge=graphify` to `.gitattributes`).
5. **Graph.** `graph.present` is `true` → skip. Say docs and images spend session tokens (code is parsed free), then invoke the third-party `graphify` skill (installed by the graphify tool in step 3, not part of this plugin) via the Skill tool with `.`; a large repo makes it ask which folder to scan, let it. Skill unavailable → tell the user to run the third-party `/graphify .` after a restart; report the graph as pending.
6. **Names.** Graph pending or `placeholders` is `0` → skip. Else run `label-missing` once and report how many remain. Detail: `${CLAUDE_SKILL_DIR}/references/details.md`.
7. **Git ignore.** `gitignore.missing` is empty → skip. A `gitignore.conflict` line is never deleted: keep the graph local only and list the line under `Open:` (`${CLAUDE_SKILL_DIR}/references/details.md`). Else run `append-ignores` (with `--create-gitignore` in a git repo): it adds the `graphify-out/*` block that un-ignores `graph.json` and `GRAPH_REPORT.md`, and `graphify-out/` to each existing line-based ignore file in `ignoreFiles`; report its `changes` and `skipped`.
8. **Lint and format ignores.** Add `graphify-out/` to each remaining existing linter and formatter config: `${CLAUDE_SKILL_DIR}/references/ignores.md`.
9. **Rules.** Copy `${CLAUDE_SKILL_DIR}/assets/graphify-rules.md` to `.claude/rules/graphify.md`: `rules` is `absent` → write; `identical` → skip; `differs` → keep the user's file, report it. `claudeMdSection` is `false` → report it.
10. **Open items.** List as `Open:` any pending graph, placeholder names left, kept-local `.gitignore`, kept rules file, missing `CLAUDE.md` section, or skipped git steps, each with a suggested fix.
11. **Report** the Output. Also tell the user: each teammate runs `graphify hook install` once per clone (git hooks and the merge driver live in `.git/`); `graphify-mcp` (`uv tool install "graphifyy[mcp]"`) is an optional manual step; graphify's README suggests a `.claudeignore`, skipped because Claude Code docs do not list that file.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For the plan (step 1), see `${CLAUDE_SKILL_DIR}/references/plan.md`.
- For CLI install, naming placeholders, and the `.gitignore` conflict, see `${CLAUDE_SKILL_DIR}/references/details.md`.
- For per-tool ignore syntax in step 8, see `${CLAUDE_SKILL_DIR}/references/ignores.md`.
- For the usage rules copied in step 9, see `${CLAUDE_SKILL_DIR}/assets/graphify-rules.md`.
- To read the setup state and append ignore lines (steps 3-9; run, never read), see `${CLAUDE_SKILL_DIR}/scripts/graphify-state.mjs`.
- For test prompts and pass criteria, see `${CLAUDE_SKILL_DIR}/references/evals.md`.

## Output

```text
CLI: installed <version> | present <version>
Skill: registered (project) | present (<project | user>)
Claude hooks: added | present
Git hooks: added | present | skipped (not a git repo)
Graph: built | present | pending (run the third-party /graphify .)
Names: renamed <n>, <m> left | present (no placeholders) | skipped (graph pending)
Git ignore: shared graph.json + GRAPH_REPORT.md (<n> lines added) | up to date | kept local only | skipped (not a git repo)
Lint/format ignores: <file: added paths>, … | none found
Rules: .claude/rules/graphify.md <added | present | kept (differs)>; CLAUDE.md section <present | missing>
Open: <item: reason; suggested fix>, … | none
Next: commit the changes | none
Result: done | nothing-to-do | stopped
Stopped: <step>: <reason> | none
```
