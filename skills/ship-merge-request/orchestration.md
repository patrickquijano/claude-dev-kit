# Orchestration

Shared by orchestrator skills that chain `cdk:` skills: `cdk:ship-merge-request`, `cdk:ship-spec-kit-bug`, `cdk:ship-spec-kit-idea`, `cdk:setup-project`.

- Orchestrator only; each step runs a `cdk:` skill via the Skill tool, in this main thread. Sub-skills ask the user via AskUserQuestion, so never fork or delegate them to subagents.
- Invoking the orchestrator counts as the user's explicit request for every chained skill; their "use only when the user explicitly asks" clause is met.
- Never repeat sub-skill work (git, glab, file writes) in the orchestrator; only read state and sub-skill Output blocks to decide the next step.
- Each Skill call yields one Output block. Read its `Result:` line in the step that invoked it.
- `stopped`, `cancelled`, a failure, or a user cancel before the Output block → stop the whole chain and report the step, unless the invoking step says how to continue. `nothing-to-do` is not a stop. Never retry silently.
