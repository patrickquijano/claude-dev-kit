# Flow

Detail for the workflow steps in `SKILL.md`.

## Contents

- Clarify · Draft · Verify and fix loop · Open items

## Clarify

Step 3. Derive triggers, jobs, `needs` graph, permissions, environments, inputs, outputs, variables, secrets, containers, services, caching, artifacts, and cleanup from the input and the analyzer. Ask only what stays missing or ambiguous.

- One AskUserQuestion call with every question together (max 4 per call, repeated if more), each with 2-4 options, the recommended one first labeled "(Recommended)", and a justification in its description; the first question also offers Stop (Stop gives `Result: cancelled`).
- Derivable means no question. Nothing left to change means `Result: nothing-to-do`.
- Analyzer `Questions` and unverified required checks go here.
- A touched job with a required check needs no question: the gate job in step 6 is automatic, also when the check is only unverified (listed under Retained constraints).
- Naming: an existing file, job id, or `name` the request touches that differs from `practices.md` `## Naming` is asked once: keep (Recommended) or rename to the scheme (a rename goes into `Check-name map`). A trigger set outside the file table, or a job outside the verb list, asks which file or verb to use. New files and jobs never get a question: they follow the scheme.
- Max 3 rounds.

## Draft

Step 6. Per `layout.md` and `practices.md`:

- The orchestrator and one callee per job, every name derived per `practices.md` `## Naming`.
- `.github/dependabot.yml` with a `github-actions` entry per `practices.md` `## Dependabot`.
- `runs-on` is the resolved label; every `uses:` and `image:` comes from the resolver table in its pinning mode (SHA mode keeps `# vX.Y.Z` comments).
- Explicit `permissions` per job, `timeout-minutes`, step-level `env`, cache and artifacts with `retention-days`, and `if: ${{ always() }}` cleanup for each credential, temp file, login, or container the job creates.
- A touched job with a required check (analyzer `Required checks`) gets the `_gate.yml` callee per `layout.md` as the single stable check; build the `Check-name map`.
- Fill `Policy applied` with each **cdk**-marked practice used and `Retained constraints` with each check rename and skipped signal.
- Update mode edits in place and lists each change with its reason.

## Verify and fix loop

Step 9. Spawn `cdk:workflow-reviewer` and use its `Findings`, `Checks`, and `Tool output`.

- Each `error` or `warning` finding: fix it in a file this run wrote, print the diff, write, and re-run the reviewer. Max 3 attempts. `info` is listed only.
- A tool `error` (actionlint or zizmor failed to run) is reported with no fix loop.
- Cap hit: stop looping and list what is left under `Open:`.

## Open items

Step 10. Itemize under `Open:` each leftover as `<item: impact; recommended fix>`:

- `Unresolved:` entries, `Skipped practices:`, and `Retained constraints:` that still need the user.
- Each `Checks:` entry that is `fail`, `n findings`, `unverified`, `error (...)`, or `not installed` (including `naming` and `zizmor`).
- Edit only the files this run wrote; never fix an open item silently outside the loop.
