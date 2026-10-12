# Verify

Details step 8 of `${CLAUDE_SKILL_DIR}/SKILL.md`; commands by name in `${CLAUDE_SKILL_DIR}/references/commands.md`.

- Self-check: valid YAML; opening `---` on line 1; `name` kebab-case, no `:`, not starting with `-`, unique in its agents directory; `description` present; `tools` and `disallowedTools` names valid; no field the scope ignores; no default-valued field; body has role line, `## Task` (step 1 names inputs), `## Return`; same `name` in another scope → warn which one wins.
- Plugin root → `validate-plugin`; else `validate-agents`.
- Spawn in one message, in parallel: `plugin-dev:plugin-validator` for a plugin location (plugin root, agent path); `plugin-dev:skill-reviewer` per spawning-skill SKILL.md written; `cdk:skill-auditor` with location root (`~/.claude`, `<repo>/.claude`, or plugin root), repo root (for `.claude/rules/`; none for `~/.claude`), and every written path, including spawning-skill edits; read its `Rules:` and `Contracts:` (`Rules: none` or no rule matched → warning).
- plugin-dev agents unavailable → skip them, note in Output `Checks`.
- Merge findings, deduplicated by file:line; collect agents' `Known issue:` lines. Any error or warning → fix; recurring or blocking → save per Known issues rule; re-verify (max 3 attempts).
