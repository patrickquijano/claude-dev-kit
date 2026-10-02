# Engineering principles

Default content for every generated set of memory files, in create and update mode. Put principles only in the three places `## Placement` names. Adapt each item to facts; never copy this file verbatim.

## Trade-off order

Correctness > security > clarity > simplicity > maintainability > testability > measured performance. Goes in the `CLAUDE.md` Precedence section as one line, stated once; the user may change it in step 4.

## Adaptation

- Principles are decision guidance, not hard rules. Write generated lines as imperatives; reserve "never" for security and data-loss items.
- Emit an item only where the repo has a place it applies (facts `Architecture`, `Stack`, `Patterns`, `Commands`). Example: idempotency only when the repo has retries, jobs, migrations, or deploy scripts.
- Write each item as a repo-specific action, not a definition. Name the repo's own tool, path, or command when facts show one ("validate input with zod in `src/api/`"); else keep a short generic line. Claude knows the definitions.
- Never invent requirements, tools, thresholds, coverage targets, log formats, or commands.
- Repo lacks the concept (e.g. no services → no operational readiness) → skip silently. Concept present but no tool (e.g. code but no test runner, no issue tracker for tech debt) → step 3 question with "Omit" option.
- Never restate a line owned by `CLAUDE.md` Changes, Boundaries, Commands, or Definition of done; Z3 penalizes the duplicate.
- Preserve the repo's existing architecture, conventions, and tooling. Never tell Claude to rewrite working code only to satisfy a principle or pattern. Example: framework built on base classes → "prefer composition outside framework base classes", not "never inherit". Conflict with an existing instruction → step 3 conflict question.
- Input guideline that mandates a pattern with no trigger from `## Patterns` in facts or verified requirements → step 3 question: keep as stated | apply only when the trigger appears | omit.
- Material deviation from a catalog default backed by a verified constraint (framework, performance target, legacy API) → one line naming the constraint, e.g. "Global `app` container: framework requirement; inject elsewhere".
- Update mode: existing principles = the rule file or `CLAUDE.md` section whose heading or main content is engineering principles. Merge there, keep author voice, add only missing items; none → create `.claude/rules/principles.md`.
- Group items; target ≤30 non-blank lines for the unconditional principles rule so always-loaded lines stay <200 (Z1).

## Placement

- Trade-off order → `CLAUDE.md` Precedence.
- Repo-wide items → unconditional `.claude/rules/principles.md` (no `paths`).
- Language, framework, directory, or domain items → path-scoped rule per facts `Stack` entry, `paths` globs matching tracked files (e.g. `src/api/**` for the API validator, `**/*.py` for Python typing). Never put them in `CLAUDE.md` or the unconditional rule.
- Hard requirement (e.g. no secrets in commits) → also suggest a hook in step 4.

## Catalog

Each group lists principles, then the action a generated line expresses.

- Simplicity — KISS, YAGNI, DRY, Single Source of Truth, measure before optimizing, avoid premature optimization: simplest working solution; no speculative features, abstractions, or extension points; extract shared code on the third occurrence; keep each business rule, constant, and schema in one place; prefer duplication over a wrong abstraction; optimize only after a measurement (profiler, benchmark, the repo's perf command) shows the need.
- Structure — SRP, OCP, LSP, ISP, DIP, separation of concerns, high cohesion, low coupling, encapsulation, abstraction, information hiding, composition over inheritance, program to interfaces, Law of Demeter: one responsibility per module in the repo's existing layers; extend through existing seams instead of editing stable callers; subtypes honor the parent contract; small focused interfaces; high-level code depends on interfaces only where two implementations or a test double exist; keep internals private; compose over deep inheritance; talk to direct collaborators only.
- Behavior — least astonishment, explicit over implicit, Command–Query Separation, Tell Don't Ask, Design by Contract, fail fast, immutability and statelessness where practical, idempotency, backward compatibility: follow existing naming and conventions; pass dependencies explicitly, no hidden globals; prefer functions that either change state or return data, not both; ask objects to act instead of pulling their state to decide; check preconditions at public entry points and stop on invalid state; no swallowed errors, errors carry context; prefer immutable data and stateless handlers where the language makes it cheap; make retried operations safe to repeat; keep public APIs, schemas, and config compatible or version them.
- Security — secure by design, secure by default, fail securely, least privilege, defense in depth: validate and encode untrusted input at trust boundaries; safe defaults (deny, off, minimum scope); errors never expose secrets, stack traces, or internals to users; secrets from env or the repo's secret store (met by a `CLAUDE.md` Boundaries secrets line; skip then); scan dependencies with the repo's scanner or CI job; minimum permissions for tokens, roles, and containers; layer checks instead of trusting one guard.
- Reliability — design for failure, graceful degradation, progressive enhancement: set timeouts on remote calls; degrade a failing optional dependency instead of crashing; core flow works without optional features (e.g. web pages without JavaScript where the repo serves HTML).
- Testing — design for testability, test behavior not implementation: new or changed behavior gets a test (command lives in `CLAUDE.md` Commands); assert observable outputs, not private calls or internal state; inject time, randomness, and I/O.
- Observability — log through the repo's logger with context and levels, never secrets or personal data; expose errors, metrics, and traces the repo already collects.
- Maintenance — automate repetitive work, Boy Scout Rule, deliberate technical-debt management: script a manual step on its third repeat, using the repo's task runner; tidy (rename, dead code) only in lines the change already edits, no separate refactor; record larger cleanups as tech debt in the repo's issue tracker instead of fixing them in the same change.
- Operations — config via env, safe migrations with rollback, health checks; only where the repo deploys or runs services.

## Patterns

Skill-side reference for step 3 (pattern mandates in input) and for naming facts `Patterns` lines; never list this catalog in generated files. Generated rules get the `## Avoid` line, one line per pattern facts `Patterns` shows in use (e.g. "Data access through repositories in `src/repositories/`"), and "add a pattern only for a problem the code shows now; name the problem in the PR or MR description or a code comment".

- Creational — Factory Method, Abstract Factory: callers must create one of several types chosen at runtime. Builder: object with many optional parts. Prototype: copying is cheaper than building. Singleton: one shared resource the platform requires; prefer a DI-managed single instance.
- Structural — Adapter: wrap a third-party or legacy API to match a local interface. Facade: one entry point over a complex subsystem. Decorator: add behavior (cache, logging, auth) without editing the wrapped code. Proxy: control access, laziness, or remoteness. Composite: tree of items treated alike. Bridge: two dimensions that vary independently. Repository: isolate data access from domain logic. Dependency Injection: swap implementations or test doubles.
- Behavioral — Strategy: interchangeable algorithms chosen at runtime. Observer / Publish–Subscribe: many consumers react to one event. Command: queue, undo, or log operations. State: behavior changes with explicit states. Template Method: fixed steps with varying parts. Chain of Responsibility: ordered handlers (middleware). Mediator: many components that would otherwise reference each other.
- Architectural — Layered, Hexagonal, Clean: keep domain logic independent of frameworks, I/O, and UI. Modular Monolith: one deployable with enforced module boundaries; default over Microservices. Microservices: proven need for independent deploy, scale, or ownership. Event-Driven: asynchronous decoupled consumers. CQRS: read and write models diverge in shape or load.
- Resilience and distributed — Retry with Backoff: transient failures on idempotent calls. Circuit Breaker: stop calling a failing dependency. Bulkhead: isolate resource pools so one failure stays contained. Cache-Aside: repeated reads of slow, rarely changing data. Saga: multi-service transaction with compensation. Outbox: publish events atomically with a database write.

## Avoid

Generated line: overengineering, forced patterns, excessive indirection, deep inheritance, hidden dependencies (globals, service locators), duplicated business rules, unnecessary dependencies (check stdlib and installed deps first), premature optimization.

## Default requirements

Required in every principles rule (E1) where the repo has the concept, each tied to a repo command, path, or check when facts show one: Security, Validation, Testing, Error handling, Observability, Maintainability, Operations (service repos only). Content per `## Catalog` group; a `CLAUDE.md` Boundaries secrets line meets secret handling.

## Rule file shape

End the principles rule with `- Verify: <check>`: a review step plus the command that proves it, e.g. "review the diff against this file before commit; then Definition of done".
