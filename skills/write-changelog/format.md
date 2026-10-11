# Changelog format

Source: Keep a Changelog 1.1.0 (<https://keepachangelog.com/en/1.1.0/>). An existing file's valid style (link format, tag prefix, header wording) wins over these defaults.

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

- Write the Semantic Versioning line only when the project states it follows SemVer (existing header or user). Not known → omit the line.
- `## [Unreleased]` is always first and always present, even when empty.
- Versions descending. Heading `## [version] - YYYY-MM-DD` (ISO 8601); yanked → `## [version] - YYYY-MM-DD [YANKED]`.
- Section order inside a version: Added, Changed, Deprecated, Removed, Fixed, Security. Omit empty sections.
- Link references at the bottom, one per heading, newest first. Oldest version links to its tag or release page (no earlier tag to compare).

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
- Describe the effect, not the diff: never copy commit subjects, never list file paths unless the path is the user-facing surface.
- Breaking change → say so in the bullet (`**Breaking:** …`) and put it under Changed or Removed.
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

**Non-release (default).** Edit only `## [Unreleased]`. Leave every released section, date, and link as is, apart from the `[unreleased]` compare link when its base tag changed (it should already point at the latest tag; fix only when verifiably wrong).

**Release.** Needs a version and a date, both from the user (arguments or answers); never infer them from commits, tags, or the clock. Then:

1. Run the non-release flow first so Unreleased is complete.
2. Stop when `[version]` already exists in the file.
3. Rename the Unreleased content into `## [version] - date`; add a fresh empty `## [Unreleased]` above it.
4. Link refs: add `[version]` compare link from the previous version to this one (first release → release page or tag URL); repoint `[unreleased]` to `<tag-for-version>...HEAD`. Use the file's existing tag prefix (`v1.2.3` or `1.2.3`) and URL host style. New file or unknown style → derive from `git remote get-url origin` (GitHub `/compare/a...b`, GitLab `/-/compare/a...b`); other host or no remote → ask or omit links.
5. Never create tags, commits, or pushes; mention that the tag must exist for links to resolve.

## Bad practices

- Commit-log dumps: pasted subjects, hashes, merge noise.
- Duplicate entries across or within sections.
- Missing, regional, or non-ISO dates.
- Inconsistent categories: same kind of change under different sections, or sections outside the six types.
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
5. Ordering: Unreleased first; versions descending; canonical section order.
6. Format: header present; `## [x] - YYYY-MM-DD`; blank lines around headings and lists; `-` bullets; file ends with one newline.
7. Links: every `[ref]` heading has a definition and every definition is used; compare URLs consistent with the style and tag prefix; tags exist (`git tag --list`) or are flagged.
8. Released sections unchanged (non-release; tracked file only): `git diff` of the file shows hunks only in Unreleased and, if needed, the `[unreleased]` link.
9. Repository consistency: formatter and linter configs accept the file; terminology matches README and skill names.
10. Idempotency: re-deriving entries from the same inputs against the written file produces no change.
