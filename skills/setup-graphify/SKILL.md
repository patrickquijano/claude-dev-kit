---
name: setup-graphify
description: Install graphify (`graphifyy`) if missing, register its Claude skill in the project, add its Claude and git hooks, build the first knowledge graph, name placeholder communities, share the graph and report through git, add ignores for linters and formatters, and write usage rules. Use only when the user explicitly asks to set up, install, or configure graphify or a code knowledge graph, e.g. "set up graphify", "install graphify in this repo". Do not use on your own after finishing a task.
allowed-tools: Bash(command -v *) Bash(graphify --version) Bash(graphify hook status) Bash(git rev-parse *) Bash(uv tool install graphifyy) Bash(pipx install graphifyy)
---

# Setup Graphify

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

A Context value of `<none>` means that read failed. A missing value or `[shell command execution disabled by policy]` means run that command's `commands.md` row instead.

## Rules

- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Idempotent: check each step's state first and skip what is done, so re-runs change nothing.
- Never pass `--strict` (it blocks reads until a query runs) or `--force`.
- Not pre-approved on purpose: `install-skill`, `install-claude-hooks`, `install-git-hooks`, `label-missing`. The first three write `.claude/settings.json` and `.git/hooks`; `label` spends LLM tokens and rewrites `graphify-out/`. The permission prompt is the second guard.
- Chaining the `graphify` skill: follow `${CLAUDE_SKILL_DIR}/../shared/references/orchestration.md`.
- Ignore files: append only missing entries; keep existing entries, order, and syntax form.
- Edit only linter and formatter configs that already exist. Only `.gitignore` and `.claude/rules/graphify.md` may be created.
- Each command runs once, no retries. The step 7 question is asked once.
- Pre-flight and step 2 (CLI) stops → print the Output with `Resolution: not run (stopped)`, `Stopped: <step>: <reason>`, and end. Any later failure or cap → run step 10 (**Resolve findings.**) on what is left, without re-entering the loop, then print the Output with `Stopped: <step>: <reason>`.
- Tool-made files (`CLAUDE.md`, `.claude/settings.json`, `.claude/skills/graphify/`, `.gitattributes`) are expected; only report them.
- Share only `graphify-out/graph.json` and `graphify-out/GRAPH_REPORT.md` (repo-relative paths, safe across machines). Everything else in `graphify-out/` holds absolute paths or per-machine state.
- AskUserQuestion unavailable: follow `${CLAUDE_SKILL_DIR}/../shared/references/fallbacks.md`.
- Final step: follow `${CLAUDE_SKILL_DIR}/../shared/references/resolve-findings.md` (scope: edit; sources: `Graph: pending`, placeholder community names left, `Git ignore: kept local only`, `Rules: kept (differs)`, `CLAUDE.md section missing`, `skipped (not a git repo)` items).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../shared/references/known-issues.md` with slug `setup-graphify` and store `${CLAUDE_PLUGIN_DATA}/known-issues`.

## Workflow

1. **Pre-flight.** Context Repo root → repo root; run every later step from it. `<none>` (not a git repo) → use the current directory, skip only the git hooks in step 4 and step 7.
2. **CLI.** `has-graphify` succeeds → skip. Else `install-uv` (when `has-uv` succeeds) or `install-pipx` (when `has-pipx` succeeds); record `version`. Neither tool, install failure, or `graphify` still missing after install → stop. Detail: `${CLAUDE_SKILL_DIR}/references/cli.md`.
3. **Skill.** `.claude/skills/graphify/.graphify_version` exists in the project, or `~/.claude/skills/graphify/.graphify_version` exists → skip. Else run `install-skill` (also does the Claude half of step 4).
4. **Hooks.**
   - Claude: `.claude/settings.json` contains `hook-guard` → skip. Else run `install-claude-hooks` (adds the `## graphify` section to `CLAUDE.md` and the PreToolUse hooks).
   - Git: `hook-status` reports post-commit, post-checkout, and the merge driver installed → skip. Else run `install-git-hooks` (also adds `graphify-out/graph.json merge=graphify` to `.gitattributes`).
5. **Graph.** `graphify-out/graph.html`, `graphify-out/GRAPH_REPORT.md`, and `graphify-out/graph.json` all exist → skip. Any missing → invoke the `graphify` skill via the Skill tool with `.`; code is parsed free, but docs and images spend session tokens, so say so before invoking. Skill not available in this session → tell the user to run `/graphify .` after `/reload-plugins` or a restart, report the graph as pending. A large repo makes `/graphify` ask which folder to scan; let it.
6. **Names.** Graph pending (step 5) → skip. Grep `graphify-out/GRAPH_REPORT.md` for `^### Community [0-9]+ - "Community [0-9]+"`. No match → skip. Else `label-missing` once (it spends LLM tokens; say so first), then report how many placeholders remain. Detail: `${CLAUDE_SKILL_DIR}/references/names.md`.
7. **Git ignore.** Ensure the root `.gitignore` (create it in a git repo) has the block below, which shares only `graph.json` and `GRAPH_REPORT.md`. Existing `graphify-out/` line, or the post-commit rebuild: `${CLAUDE_SKILL_DIR}/references/git-ignore.md`.

   ```gitignore
   graphify-out/*
   !graphify-out/graph.json
   !graphify-out/GRAPH_REPORT.md
   ```

8. **Lint and format ignores.** Add `graphify-out/` to each existing linter and formatter config in that tool's syntax from `${CLAUDE_SKILL_DIR}/../setup-husky/references/ignores.md`. Exceptions (dprint, npm, `.gitignore`-based skips): `${CLAUDE_SKILL_DIR}/references/ignores.md`.
9. **Rules.** Copy `${CLAUDE_SKILL_DIR}/assets/graphify-rules.md` to `.claude/rules/graphify.md`: absent → write; identical → skip; differs → keep the user's file, report it. Then check `CLAUDE.md` has a `## graphify` section. Missing → report it; graphify owns that section, so never hand-write it.
10. **Resolve findings.** Per resolve-findings.md. Resolve only what this skill may write (ignores, rules file). Token-spending runs, user-kept files, and graphify-owned sections stay `needs-decision` or `blocked`; never hand-write the `CLAUDE.md` section.
11. **Report** the output below. Also tell the user: each teammate runs `graphify hook install` once per clone (git hooks and the merge driver live in `.git/` and are not shared); `graphify-mcp` (`uv tool install "graphifyy[mcp]"`) is an optional manual step; graphify's README suggests a `.claudeignore`, which is skipped because Claude Code docs do not list that file.

## Output

```text
CLI: installed <version> | present <version>
Skill: registered (project) | present (<project | user>)
Claude hooks: added | present
Git hooks: added | present | skipped (not a git repo)
Graph: built | present | pending (run /graphify .)
Names: renamed <n>, <m> left | present (no placeholders) | skipped (graph pending)
Git ignore: shared graph.json + GRAPH_REPORT.md (<n> lines added) | up to date | kept local only | skipped (not a git repo)
Lint/format ignores: <file: added paths>, … | none found
Rules: .claude/rules/graphify.md <added | present | kept (differs)>; CLAUDE.md section <present | missing>
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
