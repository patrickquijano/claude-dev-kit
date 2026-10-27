# Modularization

Length cap and README splitting (`SKILL.md` steps 8 and 9).

## Contents

- Sources · Facts · Length options · Layouts · Split rules · Idempotence

## Sources

Fetched: 2026-10-27

- <https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes>
- <https://github.com/RichardLitt/standard-readme/blob/main/spec.md>
- <https://diataxis.fr/>
- <https://google.github.io/styleguide/docguide/READMEs.html>
- <https://www.makeareadme.com/>

## Facts

- GitHub truncates a rendered README beyond 500 KiB. Other hosts are unverified.
- Standard Readme: the table of contents is "Required; optional for READMEs shorter than 100 lines". It states no maximum length.
- Diátaxis has four types: tutorials, how-to guides, reference, and explanation. It prescribes no layout.
- Google: "All top-level directories for a code package should have an up-to-date README.md".
- makeareadme: "too long is better than too short … consider utilizing another form of documentation".
- No authoritative maximum line count exists. The options below are community heuristics, not rules.

## Length options

Asked only when the projection exceeds 200 lines; at 200 or fewer, max = 200 with no question. Weights follow `templates.md` `## Weights`.

| Max | Criterion that adds points                                          | Points |
| --- | ------------------------------------------------------------------- | ------ |
| 200 | Projection over 400 lines, or many sections that are reference-like | 3      |
| 200 | Several components or packages, each with its own detail            | 2      |
| 400 | Projection from 201 to 400 lines                                    | 4      |
| 400 | Single product with one audience                                    | 1      |
| 600 | Projection over 400 lines and one cohesive reference                | 3      |
| 600 | Existing README already over 400 lines and the user wrote it        | 2      |

Label the question "Line limits are community heuristics, not measured data."

## Layouts

Asked only when the projection exceeds the max. Weights follow `templates.md` `## Weights`.

| Layout         | Shape                                                                | Signals that add points                                    | Points |
| -------------- | -------------------------------------------------------------------- | ---------------------------------------------------------- | ------ |
| `landing+docs` | Landing README plus `docs/<topic>.md`                                | Default; sections are separate topics                      | 3      |
| `diataxis`     | `docs/{tutorials,how-to,reference,explanation}/`                     | Content already mixes guides, reference, and concepts      | 3      |
| `per-package`  | A README in each package, the root as an index (monorepo types only) | Packages table with several packages, each with own detail | 4      |

Never offer `per-package` for a non-monorepo type. A `docs/` directory that exists keeps its files; new split files go beside them.

## Split rules

- Every written file is at most the max.
- An oversized section splits by H3 into separate files.
- The root README keeps each moved H2 heading, a one-line summary, and a relative link to the file.
- Never delete content: every moved section appears in a linked file.
- A required section moved out stays in the root as heading plus link (`rubric.md`).
- A split file has one H1, relative links only, and a link back to the root README.
- A ToC appears in each file of 100 lines or more, per `portable.md`.

## Idempotence

A re-run on a conforming README set produces the same files. If the draft equals every current file in the set, write nothing. Existing split files are reused by path and are not renamed.
