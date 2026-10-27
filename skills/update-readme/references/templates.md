# Templates

Type detection and the weighted template question (`SKILL.md` steps 4 and 5).

## Contents

- Sources · Signals · Types · Section matrix · Weights · Justifications

## Sources

Fetched: 2026-10-27

- `gh`: <https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes>
- `sr`: <https://github.com/RichardLitt/standard-readme/blob/main/spec.md>
- `gg`: <https://google.github.io/styleguide/docguide/READMEs.html>
- `mr`: <https://www.makeareadme.com/>
- `dx`: <https://diataxis.fr/>
- `og`: <https://opensource.guide/starting-a-project/>

## Signals

Glob and Read each signal against the repo root. Points are added per type; a signal fires once. Weights are heuristic scores, not measured data.

| Signal                                                                  | CLI | Library | Web app | Framework | Published monorepo | Private monorepo | Plugin | Docs |
| ----------------------------------------------------------------------- | --- | ------- | ------- | --------- | ------------------ | ---------------- | ------ | ---- |
| Manifest `bin` field, `[project.scripts]`, `cmd/` dir, or CLI entry     | 4   | 0       | 0       | 0         | 0                  | 0                | 0      | 0    |
| Manifest `main`, `exports`, `lib`, or a registry publish config         | 0   | 4       | 0       | 2         | 0                  | 0                | 0      | 0    |
| `Dockerfile`, compose file, deploy config, or `src/app`, `pages`, `app` | 0   | 0       | 4       | 0         | 0                  | 0                | 0      | 0    |
| Manifest or docs name it a framework, or it exposes extension points    | 0   | 1       | 0       | 4         | 0                  | 0                | 0      | 0    |
| Workspace file (`pnpm-workspace.yaml`, `lerna.json`, `nx.json`, ...)    | 0   | 0       | 0       | 0         | 3                  | 3                | 0      | 0    |
| Workspace packages with a publish config or without `private: true`     | 0   | 0       | 0       | 0         | 3                  | 0                | 0      | 0    |
| Workspace root `private: true` and no publish config                    | 0   | 0       | 0       | 0         | 0                  | 3                | 0      | 0    |
| `.claude-plugin/plugin.json`, `skills/`, `agents/`, or `hooks/`         | 0   | 0       | 0       | 0         | 0                  | 0                | 4      | 0    |
| Only `*.md`, `docs/`, or a site config (`mkdocs.yml`, `docusaurus.*`)   | 0   | 0       | 0       | 0         | 0                  | 0                | 0      | 4    |

## Types

Order is the tie-break order. `minimal` is the fallback when no type fits.

| Type                | Skeleton (`assets/templates/`) | Rubric archetype |
| ------------------- | ------------------------------ | ---------------- |
| CLI                 | `cli.md`                       | cli              |
| Library             | `library.md`                   | library          |
| Web app             | `application.md`               | application      |
| Framework           | `library.md`                   | library          |
| Published monorepo  | `monorepo.md`                  | monorepo         |
| Private monorepo    | `monorepo.md`                  | monorepo         |
| Plugin/skill bundle | `plugin.md`                    | plugin           |
| Documentation repo  | `docs.md`                      | docs             |
| Minimal (fallback)  | `minimal.md`                   | minimal          |

## Section matrix

R = required, O = optional, n/a = omit. Required follows `rubric.md` `## Required sections`.

| Type                | Install | Usage | Configuration | Packages | Components | Development | License |
| ------------------- | ------- | ----- | ------------- | -------- | ---------- | ----------- | ------- |
| CLI                 | R       | R     | O             | n/a      | O          | O           | R       |
| Library             | R       | R     | O             | n/a      | n/a        | O           | R       |
| Web app             | R       | O     | R             | n/a      | O          | O           | R       |
| Framework           | R       | R     | O             | n/a      | O          | O           | R       |
| Published monorepo  | O       | O     | O             | R        | n/a        | R           | R       |
| Private monorepo    | n/a     | O     | O             | R        | n/a        | R           | R       |
| Plugin/skill bundle | R       | O     | O             | n/a      | R          | R           | R       |
| Documentation repo  | n/a     | n/a   | n/a           | n/a      | n/a        | R           | R       |
| Minimal             | n/a     | n/a   | n/a           | n/a      | n/a        | n/a         | n/a     |

Web app: `Getting started` stands for Install. Documentation repo: `Development` stands for Contributing. Minimal requires Purpose, Owner, and Build and test. License is not required when rubric C1 is N/A.

## Weights

1. Sum each type's signal points. Keep types with points above 0, the top 4 at most.
2. Percent = 100 × type points ÷ sum of kept points, rounded by largest remainder so the total is exactly 100. Equal remainders go to the type earlier in `## Types`.
3. The highest percent is Recommended. Fewer than 2 kept types → offer that type plus `minimal`, 70/30.
4. All zero → offer `minimal` plus the partial matches, and list the signals found.

## Justifications

One advantage, one drawback, and a source key per type, at most 2 sentences.

| Type                | Advantage                                                  | Drawback                                 | Key  |
| ------------------- | ---------------------------------------------------------- | ---------------------------------------- | ---- |
| CLI                 | Install and usage come first, as `sr` expects.             | Needs a verified command list.           | `sr` |
| Library             | Install and usage show the API fast.                       | API detail may need linked docs.         | `sr` |
| Web app             | Configuration is required, so deploy needs are explicit.   | Needs verified env vars and ports.       | `mr` |
| Framework           | Same sections as a library, so readers know where to look. | Extension points may outgrow one README. | `dx` |
| Published monorepo  | A packages table routes readers to each package.           | Package details live in other READMEs.   | `gg` |
| Private monorepo    | Skips install and badges that do not apply.                | Gives outsiders little to act on.        | `gg` |
| Plugin/skill bundle | A components table lists each unit.                        | Needs updating when components change.   | `og` |
| Documentation repo  | Contributing and license only, no code sections.           | Readers get no content overview.         | `dx` |
| Minimal             | Purpose, owner, and build are enough for a small repo.     | Too little for any public project.       | `mr` |
