---
name: setup-graphify
description: Install graphify (`graphifyy`) if missing, register its Claude skill in the project, add its Claude and git hooks, build the first knowledge graph, name placeholder communities, share the graph and report through git, add ignores for linters and formatters, and write usage rules. Use only when the user explicitly asks to set up, install, or configure graphify or a code knowledge graph, e.g. "set up graphify", "install graphify in this repo". Do not use on your own after finishing a task.
allowed-tools: Bash(command -v *) Bash(graphify --version) Bash(graphify hook status) Bash(git rev-parse *) Bash(uv tool install graphifyy) Bash(pipx install graphifyy)
---

# Setup Graphify

## Rules

- Idempotent: check each step's state first and skip what is done, so re-runs change nothing.
- Never pass `--strict` (it blocks reads until a query runs) or `--force`.
- Not pre-approved on purpose: `graphify install --project`, `graphify claude install --project`, `graphify hook install`, `graphify label`. The first three write `.claude/settings.json` and `.git/hooks`; `label` spends LLM tokens and rewrites `graphify-out/`. The permission prompt is the second guard.
- Chaining the `graphify` skill: follow `${CLAUDE_SKILL_DIR}/../ship-changes/orchestration.md`.
- Ignore files: append only missing entries; keep existing entries, order, and syntax form.
- Edit only linter and formatter configs that already exist. Only `.gitignore` and `.claude/rules/graphify.md` may be created.
- Each command runs once, no retries. The step 7 question is asked once.
- Any stop → print the Output with `Stopped: <step>: <reason>` and end.
- Tool-made files (`CLAUDE.md`, `.claude/settings.json`, `.claude/skills/graphify/`, `.gitattributes`) are expected; only report them.
- Share only `graphify-out/graph.json` and `graphify-out/GRAPH_REPORT.md` (repo-relative paths, safe across machines). Everything else in `graphify-out/` holds absolute paths or per-machine state.
- AskUserQuestion unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/fallbacks.md`.
- Final step: follow `${CLAUDE_SKILL_DIR}/../build-skill/resolve-findings.md` (scope: edit; sources: `Graph: pending`, placeholder community names left, `Git ignore: kept local only`, `Rules: kept (differs)`, `CLAUDE.md section missing`).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `setup-graphify`.

## Workflow

1. **Pre-flight.** `git rev-parse --show-toplevel` → repo root; run every later step from it. Not a git repo → use the current directory, skip only the git hooks in step 4 and step 7.
2. **CLI.** `command -v graphify` succeeds → skip. Else `command -v uv` succeeds → `uv tool install graphifyy`; else `command -v pipx` succeeds → `pipx install graphifyy`; neither → report "install uv: <https://docs.astral.sh/uv/>", stop. Install fails → quote the error line, stop. Install succeeds but `command -v graphify` still fails → tell the user to run `uv tool update-shell` (uv) or `pipx ensurepath` (pipx) and restart the shell, stop. Record `graphify --version`.
3. **Skill.** `.claude/skills/graphify/.graphify_version` exists in the project, or `~/.claude/skills/graphify/.graphify_version` exists → skip. Else run `graphify install --project` (also does the Claude half of step 4).
4. **Hooks.**
   - Claude: `.claude/settings.json` contains `hook-guard` → skip. Else run `graphify claude install --project` (adds the `## graphify` section to `CLAUDE.md` and the PreToolUse hooks).
   - Git: `graphify hook status` reports post-commit, post-checkout, and the merge driver installed → skip. Else run `graphify hook install` (also adds `graphify-out/graph.json merge=graphify` to `.gitattributes`).
5. **Graph.** `graphify-out/graph.html`, `graphify-out/GRAPH_REPORT.md`, and `graphify-out/graph.json` all exist → skip. Any missing → invoke the `graphify` skill via the Skill tool with `.`; code is parsed free, but docs and images spend session tokens, so say so before invoking. Skill not available in this session → tell the user to run `/graphify .` after `/reload-plugins` or a restart, report the graph as pending. A large repo makes `/graphify` ask which folder to scan; let it.
6. **Names.** Graph pending (step 5) → skip. Grep `graphify-out/GRAPH_REPORT.md` for `^### Community [0-9]+ - "Community [0-9]+"` (placeholder names left by `graphify update` or a label-less build). No match → skip. Else say it spends LLM tokens (an API key, or the `claude` CLI on its subscription; neither → graphify falls back to hub-based names, no LLM), then run `graphify label . --missing-only` once: it keeps existing names and names only the placeholders. Fails → quote the error line, report the placeholders as left, continue. Grep again and report how many placeholders remain.
7. **Git ignore.** Ensure the root `.gitignore` (create it in a git repo) has:

   ```gitignore
   graphify-out/*
   !graphify-out/graph.json
   !graphify-out/GRAPH_REPORT.md
   ```

   `graphify-out/*`, not `graphify-out/`: git cannot re-include a file whose parent folder is excluded. An existing `graphify-out/` or `/graphify-out` line blocks the negations → AskUserQuestion: Replace it with the block (Recommended; shares the graph and report with the team) | Keep local only. Keep local only → leave the line, report it. Tell the user the post-commit hook rebuilds the tracked `graph.json`, so it shows as modified after commits and goes in the next commit.

8. **Lint and format ignores.** Generated JSON, Markdown, and HTML only add noise. Add `graphify-out/` to each existing config in that tool's syntax from `${CLAUDE_SKILL_DIR}/../setup-husky/ignores.md` (Linters and formatters and Docker lines; `<entry>` = `graphify-out/`, Biome negation `!**/graphify-out`, ignore form `graphify-out`). Skip conditions in that file that rely on `.gitignore` do not apply: step 7 un-ignores two files there, so tools that read `.gitignore` would lint them. dprint has no entry syntax there: report it instead of editing. Skip the npm line; report that the shared graph files are the user's call for a published package.
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
Resolution: <n> resolved, <m> open (<id: reason; recommended fix>, …), <k> accepted | none | not run (stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
