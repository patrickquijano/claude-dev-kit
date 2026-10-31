# Options

## Contents

- Fixed criteria · Sources · Questions

## Fixed criteria

Default weights for every question:

| Criterion                          | Weight |
| ---------------------------------- | ------ |
| Official or first-party support    | 25     |
| Maintenance and community evidence | 20     |
| Fit for the stated workload        | 20     |
| Operating cost and self-hosting    | 15     |
| License                            | 10     |
| Measured performance evidence      | 10     |

The user's stated goals replace these only when they name different goals. Never bias toward a vendor.

## Sources

Every score uses the `grill.md` anchors and cites a URL or says `unverified`; license scores cite the package's license file or registry page.

## Questions

Each question is one decision question with the grill table.

| Question          | Candidates (verify each against the research)                                      |
| ----------------- | ---------------------------------------------------------------------------------- |
| Package manager   | the detected one, npm, pnpm, Yarn, Bun (only those installed or installable)       |
| Linter            | ESLint with a flat config via the ESLint CLI, Biome                                |
| `src/` directory  | with `src/`, without                                                               |
| Orval client mode | fetch, react-query (plus the Zod and MSW outputs), swr, others the Orval docs list |

Skip keeps the detected or framework default.
