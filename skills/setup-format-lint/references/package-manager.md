# Package Manager

JavaScript package rules for the npm tools this skill installs and checks.

## Package dir

- Git root `package.json` has `workspaces`, or git root has `pnpm-workspace.yaml` → git root (monorepo: repo tooling belongs at the root).
- Else nearest `package.json` from cwd up to the git root, no question (that package owns the tooling).
- None → git root.
- `<pkg>` = package dir relative to the git root (`.` at the root).

## Detect

Order, first match wins:

1. `packageManager` field in the package's `package.json` → name before `@` (`pnpm@9.1.0+sha…` → pnpm).
2. Lockfile in the package dir, then the git root: `pnpm-lock.yaml` pnpm, `yarn.lock` yarn, `bun.lock` or `bun.lockb` bun, `package-lock.json` npm.
3. No lockfile → npm (ships with Node), no question. Several lockfiles in the same dir → `unknown`: a subagent cannot ask, so it reports `unknown` and the skill asks: npm (Recommended) | pnpm | yarn | bun.

`command -v <pm>` fails → stop ("install <pm>").

## Commands

| Manager | Exec prefix `<x>` | Exec, binary must be installed | Add dev dependency |
| ------- | ----------------- | ------------------------------ | ------------------ |
| npm     | `npx`             | `npx --no-install`             | `npm install -D`   |
| pnpm    | `pnpm exec`       | `pnpm exec`                    | `pnpm add -D`      |
| yarn    | `yarn`            | `yarn`                         | `yarn add -D`      |
| bun     | `bunx`            | `bunx --no-install`            | `bun add -d`       |

Use the "binary must be installed" form in checks, so a missing tool fails instead of downloading.

## Missing package.json

- Create `{ "name": "<name>", "private": true }` in the package dir, no question (npm tools need it).
- `<name>` = package dir name, lowercased; each run of characters outside `a-z`, `0-9`, `-`, `.`, `_` → `-`; leading `.`, `_`, and `-` trimmed; empty → `project`.
- Never run `<pm> init`: `bun init` and `yarn init` scaffold extra files, and `npm init` copies every package in an existing `node_modules/` into `dependencies`.
