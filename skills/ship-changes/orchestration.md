# Orchestration

Shared by orchestrator skills that chain `cdk:` skills: `cdk:ship-changes`, `cdk:ship-spec-kit-bug`, `cdk:ship-spec-kit-idea`, `cdk:setup-project`, `cdk:scan-vulnerabilities`, `cdk:setup-devcontainer`, `cdk:assess-spec-kit-idea`, `cdk:setup-graphify`.

- Orchestrator only; each step runs a skill via the Skill tool, in this main thread, never via the Agent tool, even though `cdk:` also prefixes agent names (`cdk:change-analyzer`). Chained skills ask the user and spawn their own subagents; a subagent has no AskUserQuestion and its spawns nest deeper (depth limit; background subagents drop Agent), so never fork or delegate them.
- Never set `context: fork` on a chaining or chained skill; it runs the skill as a subagent. A nested orchestrator (e.g. `cdk:ship-spec-kit-idea` → `cdk:ship-changes`) stays in the same main thread.
- Invoking the orchestrator counts as the user's explicit request for every chained skill; their "use only when the user explicitly asks" clause is met.
- Never repeat sub-skill work (git, glab, gh, file writes) in the orchestrator; only read state and sub-skill Output blocks to decide the next step.
- Each Skill call yields one Output block. Read its `Result:` line in the step that invoked it.
- `stopped`, `cancelled`, a failure, or a user cancel before the Output block → stop the whole chain and report the step, unless the invoking step says how to continue. `nothing-to-do` is not a stop. Never retry silently.
