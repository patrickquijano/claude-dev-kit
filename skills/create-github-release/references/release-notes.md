# Release notes

Used by `cdk:create-github-release`; `hooks/scripts/lib/changelog-release.mjs` renders them. Sources: [Keep a Changelog 1.1.0](https://keepachangelog.com/en/1.1.0/), [`gh release create`](https://cli.github.com/manual/gh_release_create), [GitHub release notes](https://docs.github.com/en/repositories/releasing-projects-on-github/automatically-generated-release-notes).

## Template

```markdown
<body of the `## [x.y.z] - YYYY-MM-DD` section, verbatim: its `### Added|Changed|Deprecated|Removed|Fixed|Security` subsections>

**Full Changelog**: <repo url>/compare/<previous tag>...<tag>
```

- Title = the tag name (what `gh` and GitHub's generated notes use), so the release and tag always match.
- The version and date heading is not repeated: the release page shows the tag and publish date.
- Subsections map one to one from Keep a Changelog; nothing is reworded, reordered, merged, or added. A section with no entries is not invented.
- The compare line follows GitHub's generated-notes convention. It appears only when the previous released version's tag exists and the repo URL is known; otherwise it is omitted rather than guessed.
- `--generate-notes` is not used: it derives notes from pull requests and labels, not from the changelog this skill is bound to.

## Tags and releases

- Tag form (`v1.0.0` or `1.0.0`) follows existing semver tags; with none, the changelog's link references; with neither, the user chooses. Mixed tags need an explicit `--prefix`.
- The tag is annotated, created locally from the verified commit, then pushed, so `gh release create --verify-tag` never lets GitHub create a lightweight tag from the default branch.
- Non-draft, non-prerelease; the latest flag stays automatic. Pre-release (`-rc.1`) and `[YANKED]` versions are refused.
- With release immutability on, a published release locks its tag; check the tag and commit before publishing.
