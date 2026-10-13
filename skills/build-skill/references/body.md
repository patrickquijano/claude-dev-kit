# Body

Sources: <https://code.claude.com/docs/en/skills>, platform Agent Skills best-practices, agentskills.io spec, Anthropic engineering blog.

## Rules

- Under 500 lines and about 5k tokens: the body persists across turns, so every line is a recurring cost.
- If the two limits conflict, the stricter wins.
- Key rules first: on compaction only the first 5k tokens of each skill are re-attached (25k combined budget).
- Imperative standing instructions, each rule with its reason beside it; no filler.
- Degrees of freedom: high (prose heuristics) when many approaches work; medium (templates, parameterized scripts) when a preferred pattern exists; low (exact commands, no flags to alter) when the step is fragile.
- One consistent term per concept. Examples and templates match the strictness the output needs.
- Checklists for multi-step work; validate → fix → repeat loops with a stated cap.
- Claude already knows common facts: add only what it would get wrong.

## Anti-patterns

- Time-sensitive information ("before Aug 2025"); too many options instead of one default plus an escape hatch.
- Nested references (links from a reference to another reference); magic numbers without a reason.
- Scripts that punt errors to Claude instead of handling them; Windows-style paths; assuming a package is installed.

## Lazy loading

- Move to `references/<topic>.md` when content is conditional (only some runs need it), per variant (host or stack), or a large catalog or rubric. Keep inline what every run needs.
- References sit one level deep, linked from SKILL.md; add a table of contents when over 100 lines.
- `scripts/`: fragile deterministic steps; they are run, not read, so only output enters context. Handle errors inside the script.
- `assets/`: content copied or filled into output.

## Substitutions and injection

- `$ARGUMENTS`, `$ARGUMENTS[N]`, `$N`, named `$name` (from `arguments`), `${CLAUDE_SKILL_DIR}`, `${CLAUDE_PROJECT_DIR}`, `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}`.
- `` !`cmd` `` preprocesses before Claude sees the body and aborts the skill on non-zero exit: always `` !`cmd 2>/dev/null || echo '<none>'` ``.
- `ultrathink` in the body enables extended thinking.

## Testing

- Evaluation-driven: find gaps without the skill, write 3 scenarios, take a baseline, then add the minimal instructions that close the gaps.
- Iterate with one Claude writing the skill and another using it; test with Haiku, Sonnet, and Opus.
- A rule that must always hold belongs in a hook, not a skill.
