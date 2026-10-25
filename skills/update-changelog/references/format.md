# Changelog format

Source: Keep a Changelog 1.1.0 (<https://keepachangelog.com/en/1.1.0/>). Follow it strictly. An existing file's tag prefix and URL host are kept; header wording, link presence, and entry style always follow the spec.

## Contents

- Template · Types · Entries · Exclusions · Workflows · Bad practices · Review checklist

## Template

```markdown
# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- <entry>

## [1.0.0] - 2026-01-31

### Fixed

- <entry>

[unreleased]: https://github.com/<owner>/<repo>/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/<owner>/<repo>/releases/tag/v1.0.0
```

- Header text is exact: the title, the "All notable changes…" line, and the "The format is based on…" line.
- Write the SemVer line when the project uses SemVer: SemVer tags, SemVer versions in the file, or a statement from the user. Then the Keep a Changelog line ends with `,` as in the template. Otherwise end it with `.` and omit the SemVer line.
- `## [Unreleased]` is always first and always present, even when empty.
- Versions descending. Heading `## [version] - YYYY-MM-DD` (ISO 8601); yanked → `## [version] - YYYY-MM-DD [YANKED]`.
- Section order inside a version: Added, Changed, Deprecated, Removed, Fixed, Security. Omit empty sections.
- Link references are always present: one per version heading plus `[unreleased]` (lowercase), newest first. Oldest version links to its tag or release page (no earlier tag to compare).
- URLs come from `origin`: GitHub `/compare/a...b` and `/releases/tag/<tag>`, GitLab `/-/compare/a...b` and `/-/tags/<tag>`. Another host or no remote → ask (unattended: `Open:`). A tag that does not exist yet → still write the link and flag under `Open:`.

## Types

| Section      | Use for                           |
| ------------ | --------------------------------- |
| `Added`      | New features                      |
| `Changed`    | Changes to existing functionality |
| `Deprecated` | Features to be removed soon       |
| `Removed`    | Features now gone                 |
| `Fixed`      | Bug fixes                         |
| `Security`   | Vulnerability fixes               |

## Entries

- One bullet per user-visible change, in the imperative or plain present, naming the skill, command, option, or behavior users see. Consolidate related commits and files into one bullet.
- Each entry is one sentence of about 25 words or fewer, ending with a period. More to say → split it into several bullets.
- No bold prefixes or markers. Nested bullets only for a list of items, each following these rules.
- Describe the effect, not the diff: never copy commit subjects, never list file paths unless the path is the user-facing surface.
- Breaking change → plain wording that states what breaks and what to do, under Changed or Removed (e.g. "Rename `old-name` to `new-name`; the old name no longer works.").
- Deprecations and removals are always listed.
- Idempotent match: before adding, compare meaning against existing bullets in the target section (and the Unreleased section as a whole). Already represented → leave it; partly covered → update that bullet in place.

## Exclusions

Report each with its reason; never add:

- Merge commits and revert pairs that cancel out.
- Generated files, lockfiles, build output, snapshots.
- Formatting, whitespace, lint-only, comment-only changes.
- Internal refactors, renames, test-only, CI-only, and tooling changes with no user-visible effect.
- Changes to `CHANGELOG.md` itself.
- Work-in-progress that is added and removed within the same range.

## Workflows

**Non-release (default).** Edit `## [Unreleased]` and the link references (add missing ones; repoint `[unreleased]` when verifiably wrong). Released sections keep their content. Format-only drift in them → per `flow.md` `## Format drift`.

**Release.** Needs a version and a date, both from the user (arguments or answers); never infer them from commits, tags, or the clock (the clock date only when the user picks "Today"). Then:

1. Run the non-release flow first so Unreleased is complete.
2. `[version]` already in the file: stop or update in place per `flow.md` `## Release mode`; an unmerged section takes new Unreleased entries merged in by meaning, keeps its date, leaves Unreleased empty, and refreshes the links.
3. Else rename the Unreleased content into `## [version] - date`; add a fresh empty `## [Unreleased]` above it.
4. Link refs: add `[version]` compare link from the previous version to this one (first release → release page or tag URL); repoint `[unreleased]` to `<tag-for-version>...HEAD`. Use the file's existing tag prefix (`v1.2.3` or `1.2.3`) and URL host style. New file or unknown style → derive from `git remote get-url origin` per Template; other host or no remote → ask (unattended: `Open:`).
5. Re-running with the same version and date changes nothing.
6. Never create tags, commits, or pushes; mention that the tag must exist for links to resolve.

## Bad practices

- Commit-log dumps: pasted subjects, hashes, merge noise.
- Duplicate entries across or within sections.
- Missing, regional, or non-ISO dates.
- Inconsistent categories: same kind of change under different sections, or sections outside the six types.
- Verbose or paragraph entries; non-spec markers such as `**Breaking:**`.
- Missing link references, or a missing SemVer statement in a SemVer project.
- Silently rewriting a released section.
- Removing or renaming `Unreleased`.
- Omitting deprecations, removals, or breaking changes.
- Inventing versions, dates, or links.

## Review checklist

Each item pass or fail in the review loop:

1. Completeness: every non-excluded committed, staged, unstaged, and untracked change maps to an entry.
2. Accuracy: each entry matches the diff (names, options, behavior).
3. Duplicates: no two bullets describe the same change.
4. Classification: type matches the change; only the six sections.
5. Ordering, header, format, links: run `node ${CLAUDE_SKILL_DIR}/scripts/check-changelog.mjs check --changelog <changelog path>`; any finding fails. Also check blank lines, one-sentence entries, and flag each tag missing from `git tag --list` under `Open:`.
6. Released sections (present in the base branch's changelog) change only by approved format fixes (non-release; tracked file only): `git diff` shows hunks only in Unreleased, link references, and approved fixes.
7. Repository consistency: formatter and linter configs accept the file; terminology matches README and skill names.
8. Idempotency: re-deriving entries from the same inputs against the written file produces no change.
