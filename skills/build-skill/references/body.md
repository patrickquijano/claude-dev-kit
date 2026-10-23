# Body

Sources: <https://code.claude.com/docs/en/skills> (wins on conflict), <https://agentskills.io/specification>, <https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices>, <https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills>.

## Contents

- What stays, what moves out · Navigation · Structure per kind · Lazy loading · Substitutions · Injection · Compaction · Style · Don'ts

## What stays, what moves out

- Stays in `SKILL.md`: the always-on rules, a short procedure (each step at most 2 lines), and a `## Files` navigation section; most important content first.
- Moves out: situational detail (variants, long tables, loops with their options) to `references/`; templates to `assets/`.
- Mechanical rules (counts, formats, link checks) → a script in `scripts/`; scripts are run, not loaded.
- One skill, one job: a workflow that chains unrelated actions is two skills. Name it by the action, verb-first.

## Navigation

One line per bundled file, saying when to read it: "For <topic>, see `<file>`." No bundled file goes unlinked.

## Structure per kind

The docs name two content types (Reference, Task) and a background pattern; the sections below are this skill's convention. Skeletons: `assets/templates.md` in this skill.

| Kind            | Body                                                                                                                                                                                                           |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task            | Title, `Input: $ARGUMENTS` (when it takes input), `## Rules`, `## Workflow` (numbered, bold labels, happy path), `## Output` (a `Next: <follow-up> \| none` line before `Result:`). Every loop states its cap. |
| Reference       | Title, then topic sections: the conventions as short imperative bullets or tables, one example each where it clarifies. No workflow.                                                                           |
| Background-only | Title, then facts and constraints Claude should know, grouped by topic. No steps, no output.                                                                                                                   |

## Lazy loading

- Three levels: metadata at startup (~100 tokens per skill), body on activation (under 5,000 tokens recommended), linked files only when read.
- `SKILL.md` under 500 lines; split before the limit. Move rarely needed detail, long tables, and variants to files.
- Layout: `references/` (docs Claude reads), `assets/` (templates and files copied into output), `scripts/` (executables; only their output costs tokens). Nothing else beside `SKILL.md`.
- Link each file from `SKILL.md` with what it holds and when to read it, one level deep (a file linked from a linked file may be read only in part). A reference over 100 lines starts with a contents list.
- Mutually exclusive branches go in separate files so unused paths cost nothing.
- Say "run `scripts/x`" or "read `references/y`" explicitly. Prefer a script for deterministic work; handle errors in it and avoid unexplained constants.
- Use `/` in paths; links inside `references/` are relative, paths in `SKILL.md` use `${CLAUDE_SKILL_DIR}`; name files by content (`form_validation_rules.md`, not `doc2.md`).

## Substitutions

| Token                                                               | Value                                                                                    |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `$ARGUMENTS`                                                        | All arguments as typed. If the body has no placeholder, `ARGUMENTS: <value>` is appended |
| `$ARGUMENTS[N]`, `$N`                                               | 0-based argument; quotes group (`"a b"` is one)                                          |
| `$name`                                                             | Named argument declared in `arguments`                                                   |
| `${CLAUDE_SKILL_DIR}`                                               | This skill's directory; use it in script and file paths so they resolve at any scope     |
| `${CLAUDE_SESSION_ID}`, `${CLAUDE_EFFORT}`, `${CLAUDE_PROJECT_DIR}` | Session id, effort level, project root                                                   |
| `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}`                    | Plugin skills only                                                                       |

Escape a literal dollar as `\$1.00`. Substituted values are not re-expanded.

## Injection

- Inline `` !`cmd` `` (line start or after whitespace) or a fenced block opened with ` ```! `; the output replaces it before Claude reads the skill.
- A non-zero exit aborts the whole invocation: end each with `|| echo '<none>'` (or `|| true`). A command that needs approval also aborts unless covered by `allowed-tools`.
- Inject only fixed, read-only, unconditional reads. Not applied in files under `references/`.

## Compaction

An invoked skill stays in context but is not re-read later. After compaction only the first 5,000 tokens of each invoked skill are re-attached (25,000 combined, most recent first). Put the rules that must survive at the top.

## Style

- Add only what Claude does not already know; each paragraph must earn its tokens.
- Match freedom to fragility: heuristics for context-dependent steps, exact commands ("do not alter flags") for fragile ones.
- Short imperative steps, one default plus one escape hatch rather than many options.
- One term per concept throughout; a concrete example beats a paragraph.
- Multi-step work: a checklist. Quality-critical work: validate, fix, repeat, with a cap.
- Spawn only named `cdk:` agents from a skill, never `Explore` or `general-purpose` (`check-skill` warns).
- Task Output ends with a proactive `Next: <follow-up> | none` line before `Result:`, naming the logical next skill (`/cdk:<name>`) or action; spawn independent cdk subagents in one parallel turn (`cdk:task-worker` for read-only work, `cdk:plan-implementer` for edits), never `Explore` or `general-purpose`.
- Every skill carries the Rigor and Efficiency bullets from `assets/templates.md`: Task skills as the first bullets of `## Rules`, Reference and Background-only skills as a short topic line.
- Name MCP tools fully (`Server:tool`); list dependencies instead of assuming they are installed.

## Don'ts

- No time-sensitive facts (dates, versions that will rot); no Windows paths.
- No guidance meant to hold every time without a hook; a skill is a request.
- No `context: fork` on a body without a concrete task.
- No bundled files that the body never links.
- Self-contained: link only files inside the skill directory; never another skill's files. Copy what is needed.
