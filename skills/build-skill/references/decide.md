# Decide

Recommend one option per question with a one-line reason; the user can override.

## Scope

| Signal                                                                             | Recommend                                     | Path                                                               |
| ---------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------ |
| Repo-specific conventions or workflow; teammates should get it through git         | Project                                       | `<repo>/.claude/skills/<name>/SKILL.md`                            |
| Your own cross-project habit, not for the team                                     | Personal                                      | `~/.claude/skills/<name>/SKILL.md`                                 |
| `.claude-plugin/plugin.json` at the target root, or a skill meant for distribution | Plugin                                        | `<plugin root>/skills/<name>/SKILL.md`, invoked `/<plugin>:<name>` |
| No signal                                                                          | Project when cwd is a git repo, else Personal |                                                                    |

- Same name at several levels: enterprise over personal over project. Plugin skills are namespaced, so they never collide with local ones.
- Nested `.claude/skills/` in a subdirectory load only when Claude first reads or edits a file there.
- Skill directory changes under Personal and Project reload live; a top-level skills directory that did not exist at session start needs `/reload-skills`.

## Kind

| Signal                                                                                               | Recommend                      | Why                                        |
| ---------------------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------ |
| Steps with side effects or a fixed sequence the user triggers (deploy, commit, generate files)       | Task                           | Step-by-step action instructions           |
| Conventions, style, or domain knowledge Claude applies while doing other work                        | Reference                      | Adds knowledge inline                      |
| Context Claude should know but that has no `/command` meaning (legacy system notes, domain glossary) | Background-only                | Claude loads it; the user never invokes it |
| Rule that must hold every time with no judgment                                                      | None: a hook, not a skill      | Skills are requests, not guarantees        |
| Always-on project rule                                                                               | None: CLAUDE.md or a rule file | Skills load on demand                      |
| Needs context isolation or a heavy read-only sweep                                                   | None: a subagent               | A skill adds to the main context           |

Add a skill when the same playbook is pasted a third time. A convention Claude gets wrong twice belongs in CLAUDE.md.

## Invocation

| Kind and signal                                           | Set                                                                                                                                                                                                            |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Task with side effects (writes, pushes, deploys, deletes) | `disable-model-invocation: true` (recommended): only the user triggers it; its description also leaves context. Skip it when another skill must invoke this one through the Skill tool, which the flag blocks. |
| Task, read-only or reversible                             | Omit both flags                                                                                                                                                                                                |
| Reference                                                 | Omit both flags; add `paths` globs when it applies only to certain files                                                                                                                                       |
| Background-only                                           | `user-invocable: false`; add `disable-model-invocation: true` only if Claude must not load it either                                                                                                           |
| Task needing isolation and a self-contained body          | `context: fork` (+ `agent`); never for Reference or Background-only (a fork with no task returns nothing)                                                                                                      |

Ask only for what the table cannot derive from the extracted facts.

## One job

A skill does exactly one job. Signals of several: "and" between unrelated actions, separate triggers or outputs, steps with no shared input.

- Recommend **Split** when the jobs are independent: one skill per job, each built in turn through workflow steps 2–8.
- Recommend **Pick one** when one job dominates: the rest go to `Gaps:`.
- Update that adds a second job → same question.

## Name

- Verb-first and the action, not the actor: `review-code`, `write-changelog`, not `code-reviewer`, `changelog-writer`.
- Update of an existing skill with an actor name → ask "Rename (Recommended) | Keep, report in Gaps".
