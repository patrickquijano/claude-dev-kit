# README Rubric

Total 100. Pass ≥95.

## Scoring

Type: `bin` = full or 0; `ratio` = max × (passing units ÷ total units), floor to whole points.

| ID  | Category                 | Criterion                                                                                             | Type  | Max |
| --- | ------------------------ | ----------------------------------------------------------------------------------------------------- | ----- | --- |
| S1  | Structure & navigation   | Exactly one H1; matches repo or package name.                                                         | bin   | 3   |
| S2  | Structure & navigation   | Unit = heading. ATX only, no skipped level, not duplicate.                                            | ratio | 3   |
| S3  | Structure & navigation   | Unit = required section for archetype (see `## Required sections`) present.                           | ratio | 6   |
| S4  | Structure & navigation   | README ≥100 lines: ToC after intro. Unit = other H2 linked from ToC. <100 lines → N/A.                | ratio | 3   |
| P1  | Purpose                  | First paragraph after title states what it is + why (a benefit or use case), 1–3 sentences.           | bin   | 8   |
| P2  | Purpose                  | One-line description under H1, ≤120 chars; starts with or paraphrases manifest `description`.         | bin   | 4   |
| P3  | Purpose                  | Status stated when experimental, beta, or deprecated. No such signal → N/A.                           | bin   | 3   |
| G1  | Getting started          | Unit = prerequisite (runtime, tool on `PATH`) listed; with version when manifest pins one.            | ratio | 5   |
| G2  | Getting started          | Unit = install command: fenced, copy-paste runnable, placeholders explained.                          | ratio | 8   |
| G3  | Getting started          | Quickstart reaches first success (run, import, invoke) in ≤5 steps. Step = one command or list item.  | bin   | 7   |
| U1  | Usage & examples         | ≥1 runnable example fitting archetype (import for library, command for CLI, invocation for plugin).   | bin   | 8   |
| U2  | Usage & examples         | Expected output or behavior shown for examples.                                                       | bin   | 4   |
| U3  | Usage & examples         | Unit = config option, flag, or env var in facts `Config`, documented. None in repo → N/A.             | ratio | 3   |
| A1  | Accuracy vs repo         | Unit = command shown; exists (package script, Makefile target, bin, facts `Commands`, external tool). | ratio | 6   |
| A2  | Accuracy vs repo         | Unit = facts `Components` item listed, plus each listed item not in repo counts as failing unit.      | ratio | 6   |
| A3  | Accuracy vs repo         | Unit = path, name, version, in-repo URL; correct. External URLs not fetched.                          | ratio | 3   |
| F1  | Code blocks & formatting | Unit = code block; fenced with language tag.                                                          | ratio | 3   |
| F2  | Code blocks & formatting | Input and output in separate blocks; omissions marked with code comments, not `...`.                  | bin   | 2   |
| F3  | Code blocks & formatting | Repo markdown linter passes on README. No safe linter (see scorer) → N/A.                             | bin   | 3   |
| L1  | Links                    | Unit = relative link; target file exists, anchor matches heading slug of detected host.               | ratio | 3   |
| L2  | Links                    | Unit = link; descriptive text, not "here", "link", "click".                                           | ratio | 2   |
| C1  | Community & legal        | License: SPDX id, link to actual license file, last section.                                          | bin   | 4   |
| C2  | Community & legal        | Contributing/dev setup + support/contact present; links CONTRIBUTING, CODE_OF_CONDUCT if they exist.  | bin   | 3   |

Category totals: Structure 15, Purpose 15, Getting started 20, Usage 15, Accuracy 15, Formatting 8, Links 5, Community 7 = 100.

## N/A rules

N/A → full points; evidence states rule. Use only these rules and the per-criterion N/A text above.

| Archetype | N/A criteria                   |
| --------- | ------------------------------ |
| minimal   | P2, G1, G3, U1, U2, U3, C1, C2 |
| docs      | G1, G2, G3, U1, U2, U3         |
| monorepo  | U1, U2 (in package READMEs)    |

- Item in prompt `Omitted:` list (user chose to omit) → criteria needing it N/A: license → C1; contact/support → C2 support part; status → P3.
- Facts `Visibility: private` and no license file → C1 N/A.
- Ratio with zero units → N/A.

## Required sections

Match headings case-insensitive. Synonyms: Install = Installation = Getting started; Usage = Examples = Quickstart; Development = Contributing; Components = Skills/Commands/Features table; Owner = Contact = Maintainers. Title = the H1. Description = one-line text under H1.

| Archetype   | Required                                                        |
| ----------- | --------------------------------------------------------------- |
| library     | Title, Description, Install, Usage, License                     |
| cli         | Title, Description, Install, Usage (commands + output), License |
| application | Title, Description, Getting started, Configuration, License     |
| plugin      | Title, Description, Install, Components, Development, License   |
| monorepo    | Title, Description, Packages table, Development, License        |
| minimal     | Title, Purpose, Owner, Build and test                           |
| docs        | Title, Description, Contributing, License                       |

License not required when C1 is N/A.

## Sources

- <https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes>
- <https://github.com/RichardLitt/standard-readme/blob/main/spec.md>
- <https://www.makeareadme.com/>
- <https://google.github.io/styleguide/docguide/READMEs.html>
- <https://google.github.io/styleguide/docguide/style.html>
- <https://developers.google.com/style/code-samples>
- <https://github.com/othneildrew/Best-README-Template>
- <https://diataxis.fr/>
- <https://opensource.guide/starting-a-project/>
