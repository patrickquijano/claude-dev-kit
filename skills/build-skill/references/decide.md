# Decide

Ask only what the input cannot settle; every option's reason comes from facts found in the input or target root, never a default guess. Format: AskUserQuestion, 2–4 options, recommended first with "(Recommended)", reason in its description.

## Scope

- Derive without asking when the input gives a path or names an existing skill.
- Plugin vs Project both match (repo-specific skill inside a plugin root) → ask.
- **Plugin** (plugin root): the target root has `.claude-plugin/plugin.json`, or the skill is meant for distribution.
- **Project** (`.claude/skills`): the skill names this repo's paths, commands, or conventions; shared with the team via git.
- **Personal** (`~/.claude/skills`): the user's own cross-repo workflow with no repo specifics.

## Kind

- **Task**: an action with steps, arguments, or side effects (deploy, commit, generate, post).
- **Reference**: conventions or domain knowledge applied while doing other work. Suggest `paths` when tied to file globs.
- **Background-only**: knowledge with no meaning as a `/command`; set `user-invocable: false`.

## Invocation (Task with side effects only)

1. Grep the target root for Skill-tool chains of the name, and for hook scripts invoking it.
2. Unchained → recommend `disable-model-invocation: true` (nothing needs Claude to call it).
3. Chained, or invoked by a hook through the Skill tool → description gating only; say why (the flag blocks the chain).
4. Read-only Task → leave model invocation on.
5. Reference: never disable model invocation; auto-loading is the point.
6. Background-only with `disable-model-invocation: true` → refuse: nothing could invoke it.

## Shape (Task only)

- **Single skill**: linear task, user interaction, small context.
- **Orchestrator + subagents**: parallel steps, large reads or outputs to isolate, distinct tool scopes.
- **Subagent only** → stop, `/cdk:build-agent`.
