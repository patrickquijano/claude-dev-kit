---
name: setup-graphify
description: Installs graphify, adds its hooks, builds the first code knowledge graph, and writes usage rules. Use only when the user explicitly asks to set up graphify or a code knowledge graph.
allowed-tools: Bash(command -v *) Bash(graphify --version) Bash(graphify hook status) Bash(git rev-parse *) Bash(uv tool install graphifyy) Bash(pipx install graphifyy)
---

# Setup Graphify

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `commands.md` row.

## Rules

- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Idempotent: check each step's state first and skip what is done, so re-runs change nothing.
- Never pass `--strict` (it blocks reads until a query runs) or `--force`.
- Not pre-approved on purpose: `install-skill`, `install-claude-hooks`, `install-git-hooks`, `label-missing`. The first three write `.claude/settings.json` and `.git/hooks`; `label` spends LLM tokens and rewrites `graphify-out/`. The permission prompt is the second guard.
- Ignore files: append only missing entries; keep existing entries, order, and syntax form. Edit only linter and formatter configs that already exist; only `.gitignore` and `.claude/rules/graphify.md` may be created.
- Each command runs once, no retries; the step 7 question is asked once. No fix loop: leftovers are reported, never hand-written.
- Tool-made files (`CLAUDE.md`, `.claude/settings.json`, `.claude/skills/graphify/`, `.gitattributes`) are expected; only report them. Never hand-write the `CLAUDE.md` `## graphify` section.
- Share only `graphify-out/graph.json` and `graphify-out/GRAPH_REPORT.md` (repo-relative paths, safe across machines); the rest of `graphify-out/` holds absolute paths or per-machine state.
- Pre-flight or CLI (step 2) stop → print the Output with `Stopped: <step>: <reason>` and end. Any later failure → continue with the remaining steps, list it under `Open:`, and set `Result: stopped` only when nothing more can run.
- AskUserQuestion unavailable: ask the pending question as plain text with its options, end the turn, and take the next message as the answer. Unattended (chained, no AskUserQuestion): ask nothing; take each question's recommended option.
- Chained by other skills through the Skill tool, so it never sets `disable-model-invocation`.

## Workflow

1. **Pre-flight.** Context Repo root → repo root; run every later step from it. `<none>` (not a git repo) → use the current directory, skip the git hooks in step 4 and step 7.
2. **CLI.** `has-graphify` succeeds → skip. Else install with uv or pipx and record `version`; no tool or failure → stop. Detail: `${CLAUDE_SKILL_DIR}/references/details.md`.
3. **Skill.** `.claude/skills/graphify/.graphify_version` exists in the project, or `~/.claude/skills/graphify/.graphify_version` exists → skip. Else run `install-skill` (also does the Claude half of step 4).
4. **Hooks.**
   - Claude: `.claude/settings.json` contains `hook-guard` → skip. Else run `install-claude-hooks` (adds the `## graphify` section to `CLAUDE.md` and the PreToolUse hooks).
   - Git: `hook-status` reports post-commit, post-checkout, and the merge driver installed → skip. Else run `install-git-hooks` (also adds `graphify-out/graph.json merge=graphify` to `.gitattributes`).
5. **Graph.** `graphify-out/graph.html`, `GRAPH_REPORT.md`, and `graph.json` all exist → skip. Else say docs and images spend session tokens (code is parsed free), then invoke the `graphify` skill via the Skill tool with `.`; a large repo makes it ask which folder to scan, let it. Skill unavailable → tell the user to run `/graphify .` after `/reload-plugins` or a restart; report the graph as pending.
6. **Names.** Graph pending → skip. Grep `graphify-out/GRAPH_REPORT.md` for `^### Community [0-9]+ - "Community [0-9]+"`; no match → skip. Else run `label-missing` once and report how many remain. Detail: `${CLAUDE_SKILL_DIR}/references/details.md`.
7. **Git ignore.** Ensure the root `.gitignore` (create it in a git repo) has the block below. An existing `graphify-out/` line needs a question: `${CLAUDE_SKILL_DIR}/references/details.md`.

   ```gitignore
   graphify-out/*
   !graphify-out/graph.json
   !graphify-out/GRAPH_REPORT.md
   ```

8. **Lint and format ignores.** Add `graphify-out/` to each existing linter and formatter config: `${CLAUDE_SKILL_DIR}/references/ignores.md`.
9. **Rules.** Copy `${CLAUDE_SKILL_DIR}/assets/graphify-rules.md` to `.claude/rules/graphify.md`: absent → write; identical → skip; differs → keep the user's file, report it. Then check `CLAUDE.md` has a `## graphify` section; missing → report it.
10. **Open items.** List as `Open:` any pending graph, placeholder names left, kept-local `.gitignore`, kept rules file, missing `CLAUDE.md` section, or skipped git steps, each with a suggested fix.
11. **Report** the Output. Also tell the user: each teammate runs `graphify hook install` once per clone (git hooks and the merge driver live in `.git/`); `graphify-mcp` (`uv tool install "graphifyy[mcp]"`) is an optional manual step; graphify's README suggests a `.claudeignore`, skipped because Claude Code docs do not list that file.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For CLI install, naming placeholders, and the `.gitignore` conflict question, see `${CLAUDE_SKILL_DIR}/references/details.md`.
- For per-tool ignore syntax in step 8, see `${CLAUDE_SKILL_DIR}/references/ignores.md`.
- For the usage rules copied in step 9, see `${CLAUDE_SKILL_DIR}/assets/graphify-rules.md`.

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
Open: <item: reason; suggested fix>, … | none
Next: /cdk:commit-changes | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
