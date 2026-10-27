# Naming

- Existing names are never changed (workflow `name:`, job IDs, job `name:`, file names); a rename is a breaking change, listed under `Breaking:`.
- New workflow file: `<purpose>.yml` in kebab-case (`ci.yml`, `release.yml`, `deploy-production.yml`); reusable workflows `reusable-<name>.yml`.
- New workflow `name:`: Title Case of the purpose (`CI`, `Release`).
- New job IDs: lowercase kebab-case verbs or nouns (`lint`, `test`, `build`); a job `name:` only when the ID alone reads badly.
- Step `name:` on every step: imperative, sentence case (`Install dependencies`).
- Environment names match the repo's existing ones; new ones are asked, never invented.
