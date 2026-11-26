# Commands

`<path>` is the argument or `.`, `<root>` the output of `repo-root`, `<tag>` the `tag` from `release-json`; each is always in single quotes.

Rows use the plain `git <subcommand> …` form with the repository root as the working directory. Only when `<path>` is not the working directory, run `repo-root` and every later `git` row as `git -C '<root>' <subcommand> …` (`repo-root` with `-C '<path>'`); `-C` is outside `allowed-tools`, so the permission prompt approves it.

| Name | Command | Purpose | MCP tool |
| --- | --- | --- | --- |
| `repo-root` | `git rev-parse --show-toplevel` | Repository root; failure = not a repository | — |
| `release-json` | `node "${CLAUDE_SKILL_DIR}/scripts/changelog-tag.mjs" '<root>/CHANGELOG.md'` | JSON `{ok, version, tag, message}` or a stop code (`no-changelog`, `no-dated-version`) | — |
| `tag-exists` | `git tag -l '<tag>'` | Non-empty = the tag exists locally | — |
| `head` | `git rev-parse --short HEAD` and `git log -1 --format=%s` | HEAD short sha and subject, recorded at step 5 | — |
| `create-tag` | `msg=$(node "${CLAUDE_SKILL_DIR}/scripts/changelog-tag.mjs" --message '<root>/CHANGELOG.md') && git tag -a --cleanup=whitespace -m "$msg" '<tag>'` | Annotated tag at HEAD with the release message; a script failure creates no tag | — |
| `tag-sha` | `git rev-parse --short '<tag>^{commit}'` | Commit the tag points to | — |
