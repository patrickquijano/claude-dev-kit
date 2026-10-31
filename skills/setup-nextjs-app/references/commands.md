# Commands

Run by name; never alter flags. Versions come from the resolver; a pinned number never appears in this skill. `<pm>` and `<exec>` follow the chosen package manager.

| Name           | Command                                                 | Purpose                                                |
| -------------- | ------------------------------------------------------- | ------------------------------------------------------ |
| `git-root`     | `git rev-parse --show-toplevel`                         | Fails outside a git repo (preloaded)                   |
| `node-version` | `node --version`                                        | Fails when Node.js is missing (preloaded)              |
| `next-engines` | `npm view next engines`                                 | Minimum Node for Next.js                               |
| `latest`       | `npm view <pkg> dist-tags.latest`                       | Latest stable version; fallback registry row           |
| `pm-check`     | `command -v <pm>`                                       | Fails when the package manager is missing              |
| `scratch`      | `mktemp -d`                                             | Scratch dir for the scaffold                           |
| `create-app`   | `<exec> create-next-app@latest <scratch> --disable-git` | Scaffold into a scratch dir; flags per research        |
| `add`          | `<pm> add <pkg>`                                        | Dependencies; `-D` for dev tools (`npm install -D`)    |
| `lint`         | `<pm> run lint`                                         | ESLint CLI or Biome per the pick                       |
| `typecheck`    | `<exec> tsc --noEmit`                                   | Type check                                             |
| `unit`         | `<exec> vitest run --coverage`                          | Unit and integration projects with coverage thresholds |
| `e2e`          | `<exec> playwright test`                                | End-to-end tests against a production build            |
| `orval`        | `<exec> orval`                                          | Generate the client, Zod schemas, and MSW mocks        |
