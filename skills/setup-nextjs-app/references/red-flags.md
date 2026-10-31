# Red flags

Seed list for the step 14 pass; the research adds findings.

## Contents

- Seed flags · Pass

## Seed flags

| ID | Cause | Options to weigh |
| -- | ----------------------------------------------------- | --------------------------------------------------------------------------------------- |
| N1 | `next lint` is removed in the resolved major (ESLint topic) | ESLint CLI with a flat config; Biome |
| N2 | Turbopack default fails on a custom webpack config (Installation topic) | Remove the config; opt into webpack explicitly; keep Turbopack only |
| N3 | Vitest cannot test async Server Components (Vitest topic) | Cover with Playwright and exclude from unit coverage with the cited reason; restructure |
| N4 | The resolved Tailwind major does not auto-detect `tailwind.config.js` (Tailwind topic) | `@tailwindcss/postcss` plus CSS import; an explicit config reference |
| N5 | Vitest `workspace` is deprecated (Vitest topic) | `test.projects` |
| N6 | Orval-generated files lower coverage or fail lint (Orval topic) | Exclude the generated directories from coverage and lint; regenerate in CI |
| N7 | `create-next-app` refuses a non-empty directory (Installation topic) | Scratch scaffold and move files in; scaffold in a subfolder |
| N8 | The 80% threshold fails on the sample project (Vitest topic) | Add sample tests; exclude only generated and framework entry files with a cited reason |

## Pass

1. Review the written files against this list and the research findings; add rows for anything new.
2. One table row per flag: ID, root cause, 2-3 options, the chosen one, and a one-line reason citing a URL or `unverified`.
