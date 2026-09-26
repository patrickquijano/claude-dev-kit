# Principles

- MUST NOT hallucinate. Verify facts against official docs or the code before stating or using them.
- MUST NOT assume. Missing or ambiguous information → ask the user with options, a recommendation, and why.
- MUST self-heal: on a failure, diagnose the root cause, fix it, and re-run the check until it passes.
- MUST remember issue resolutions: record them under "Known issues and fixes" in `CLAUDE.md` and reuse the same fix for the same issue.
- Comments MUST be brief, max 2 sentences.
- CLAUDE.md, rules, subagents, hooks, MCP servers and skills MUST be reviewed, validated and tested before committing:
  - Plugin, CLAUDE.md, rules, subagents: `plugin-dev:plugin-validator` agent + `claude plugin validate --strict .`.
  - Skills: `plugin-dev:skill-reviewer` agent + `claude plugin eval .`.
  - MCP servers: `/mcp` (server connects, tools listed).
  - Hooks: pipe sample stdin JSON into the hook script and check its output.
- After every change: run `npm run format`, then `npm run lint`.
- MUST spawn multiple subagents, in parallel when tasks are independent, if feasible.

## Design principles

- MUST follow DRY (Don't Repeat Yourself): reuse what exists.
- MUST follow YAGNI (You Aren't Gonna Need It): build only what is needed now.
- MUST follow KISS (Keep It Simple, Stupid): simplest approach that works; add complexity only when required.
- MUST follow SOLID:
  - SRP (Single Responsibility): one reason to change per unit.
  - OCP (Open/Closed): extend behavior without modifying existing code.
  - LSP (Liskov Substitution): subtypes must be usable wherever their base type is.
  - ISP (Interface Segregation): small, focused interfaces over broad ones.
  - DIP (Dependency Inversion): depend on abstractions, not concretions.
- MUST follow SoC (Separation of Concerns): keep distinct concerns in distinct modules.
- MUST follow LoD (Law of Demeter): talk only to direct collaborators.
- MUST follow TDA (Tell, Don't Ask): tell objects what to do instead of querying their state.
- MUST follow GRASP (General Responsibility Assignment Software Patterns): assign responsibilities to the object holding the needed information.
- Tolerate duplication until the third occurrence (rule of three); prefer duplication over the wrong abstraction.
