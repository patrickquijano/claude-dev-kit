# Nextjs

## Contents

- Scaffold · Structure · Tailwind · Vitest · Playwright · Orval · Samples

## Scaffold

- `create-app` into a scratch dir with `--disable-git` and the picked package manager, linter, and `src/` choices; move files into the repo root.
- Accept: `package.json` has the resolved Next.js version; no `.git` was created in the scratch output.

## Structure

- Folders per the official project-structure docs for the picked `src/` choice.
- Accept: `app/` (or `src/app/`) exists with a layout and page.

## Tailwind

- Per research for the resolved Tailwind major; no `tailwind.config.js` unless research requires it (N4).
- Accept: a utility class renders in the production build.

## Vitest

- `test.projects`: `unit` (`tests/unit/**`, mirroring `src` paths) and `integration` (`tests/integration/**`).
- `@vitest/coverage-v8` with `coverage.include` the source dir; thresholds 80 for lines, functions, branches, and statements; exclude Orval-generated dirs and async Server Components with the cited reason.
- Accept: `unit` passes and enforces the thresholds.

## Playwright

- `testDir: tests/e2e`; `webServer` runs a production build and start.
- Accept: `e2e` passes against the build.

## Orval

- `orval.config.ts` with the picked client mode, `zod` output, and MSW mocks; Faker supplies mock data.
- Generated paths excluded from coverage and lint (N6).
- Accept: `orval` runs against a spec and the output compiles.

## Samples

- Add sample tests only as needed for the thresholds: a unit test, an integration test using MSW, and one E2E test.
- Accept: `lint`, `typecheck`, `unit`, and `e2e` all pass.
