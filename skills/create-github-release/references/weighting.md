# Weighting

Weights for the two release questions. Integer weights sum to 100; the highest total is Recommended, one option only. The top two within 5 points → say "close call" and recommend none. Every option shows an evidence line and one trade-off. Evidence is cited, never invented; an unverified fact is marked "unverified".

## Contents

- Tag input · Tag signals · Draft or published · Thin evidence · Option line

## Tag input

Write `<scratch>/tag-input.json` for `tag-plan`: `{"tags":[…],"releases":[…],"commits":["<subject>",…],"labels":["<label>",…],"changelogVersions":["<x.y.z>",…],"today":"YYYY-MM-DD"}`. `commits` are the subjects since the latest release; `labels` are the labels of the merged PRs in that range; `changelogVersions` is the `versions` output. The output `candidates` are `patch`, `minor`, `major`, `prerelease` (SemVer), `first` (no stable tag), or `calver`; each has `tag` and `hasSection`.

## Tag signals

SemVer 2.0.0. While the latest stable is `0.y.z`, a breaking change raises the minor and a feature raises the patch; major `1.0.0` means a declared stable API.

| Signal                                                                      | Raises                          |
| --------------------------------------------------------------------------- | ------------------------------- |
| `breaking` > 0, label `breaking` or `major`                                 | major (0.y.z: minor)            |
| `feat` > 0, label `enhancement`, `feature`                                  | minor (0.y.z: patch)            |
| only `fix`, `other`, label `bug`, `fix`, `dependencies`                     | patch                           |
| changelog has `### Removed` or `### Changed` in the candidate's section     | major or minor, as for breaking |
| changelog has only `### Added` in the candidate's section                   | minor                           |
| the candidate has a `## [x.y.z]` section (`hasSection`)                     | +15 to that candidate           |
| the latest release is a pre-release, or the user mentions a candidate build | `prerelease`                    |
| CalVer repo                                                                 | the single `calver` candidate   |

A candidate without `hasSection` ends in `Stopped: 5` unless the user adds the section, so the evidence line says so. `hasSection` outweighs the commit signals when the section's headings contradict them (for example commits say `fix` but the section has `### Removed`).

## Draft or published

| Fact                                                             | Favors                                         |
| ---------------------------------------------------------------- | ---------------------------------------------- |
| tag does not exist yet and a workflow triggers on tag or release | draft (the publish fires the workflow once)    |
| immutable releases enabled                                       | draft (a published release cannot be changed)  |
| assets still to upload                                           | draft                                          |
| SemVer pre-release suffix                                        | published as a pre-release, or draft to review |
| notes need review (empty kept lines, merged foreign text)        | draft                                          |
| tag exists, notes final, no workflow trigger                     | published                                      |
| update of a published release                                    | Keep current                                   |

Update adds a third option, `Keep current`, which leaves `isDraft` unchanged and carries the weight of "no reason to change".

## Thin evidence

Fewer than 2 commits, or the signals split evenly (for example 1 `feat!` and 1 `feat`), or no `hasSection` on any candidate → weights stay within 5 points of each other and the question says "close call".

## Option line

`<tag> — <weight>% — <evidence>; trade-off: <cost>`. Example: `v0.7.0 — 55% — 3 feat, 0 breaking, changelog section present; trade-off: skips a patch number`. The Recommended option is first and ends with `(Recommended)`.
