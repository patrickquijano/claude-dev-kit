# Flow details

## Contents

- Find drafts · Publish options · Publish · Draft new · Unattended · Open items

## Find drafts

- `release-list` → entries with `isDraft` true, newest `createdAt` first. `--tag <tag>` keeps only that tag; already published → `Stopped: 2: not-a-draft: <tag>`; no release for it → `## Draft new` with that tag (no question).
- Several drafts: one question, options = the 2 newest drafts (label = tag, description = title and date), `None of these (draft a new one from CHANGELOG.md)`, Stop. Older drafts are reachable through the free-text Other answer, which must match a draft tag.
- Choosing `None of these` goes to `## Draft new`; the draft question is never asked again.

## Publish options

After `release-view` of the draft, `remote-tag` for its tag, and `notes` for its version (strip a leading `v` to get the version), ask in up to three batches. Skip a question the input already answers.

Batch 0 (only when `action-file` is non-empty, one question):

1. Marketplace: `No (Recommended)` | `Yes, keep it a draft and give me its link` | Stop. Question text: "Publish this Action to the GitHub Marketplace?" and that the listing is a web-only checkbox, so on Yes the skill does not publish the release: it leaves it a draft and hands over the draft's link to publish from the browser. Yes → the action is `Keep as draft`: skip the action question and batch 2.

Batch 1 (at most 2 questions):

1. Action (skipped after a Marketplace `Yes`): `Publish (Recommended)` | `Keep as draft` | `No, draft a new one from CHANGELOG.md` | Stop. The question text names the tag, `targetCommitish`, and, when `remote-tag` is empty, that publishing creates the tag at that target. For a draft just created by `## Draft new`, drop the `No, draft a new one` option.
2. Notes (only when `notes` succeeded for that version and the draft's `body` differs from it): `Keep draft notes (Recommended)` | `Replace with CHANGELOG.md <version> section` | Stop.

Batch 2 (only for `Publish`, at most 2 questions):

1. Kind: `Latest` (recommended unless the version has a pre-release label such as `-rc.1`, then `Pre-release` first) | `Pre-release` | Stop.
2. Discussion category (only when `discussion-categories` returns names; run it with the owner and name from `repo-view`): `None (Recommended)` | the first two category names | Stop. Any other category is reachable through the free-text Other answer, which must match a returned name. GitHub takes one discussion category per release; a second one is reported in `Open:`, never applied.

- `No, draft a new one` is a no on a lone draft: go to `## Draft new`; the draft stays untouched.
- Stop on any question → `Result: cancelled`; the draft stays as it is.

## Publish

- `Publish` → `publish-latest` or `publish-prerelease`; add `--notes-file` only for `Replace with CHANGELOG.md`, and `--discussion-category` only for a picked category.
- Marketplace `Yes` → never publish: the release stays a draft (run `update-notes` only for `Replace with CHANGELOG.md`). Add to `Open:` the draft's link `https://github.com/<owner>/<name>/releases/edit/<tag>` (owner and name from `repo-view`) with "tick `Publish this Action to the GitHub Marketplace` and publish the release"; `Marketplace: handed off`, `Release: <url> (kept as draft)`, `Action: keep as draft`. `No` → `declined`; no `action-file` → `n/a`.
- `Keep as draft` → run `update-notes` only for `Replace with CHANGELOG.md`; the release stays a draft (`Release: <url> (kept as draft)`, `Action: keep as draft`).
- A failure → `Stopped: 5: publish-failed: <error>`; the draft stays and nothing is retried. A rejected category stops the same way; no retry without it.
- `verify-release`: `isDraft` still true, or `isPrerelease` not as chosen → list it in `Blocked:`; never edit again.
- `Tag:` is `exists on origin` when `remote-tag` was non-empty before publishing, else `created by publish at <targetCommitish>`.

## Draft new

- Scratch comes from pre-flight. Run `notes --version <tag without a leading v>` with `--tag`, else `notes --version latest`. Any `ok: false` → `Stopped: 6: <code>: <message>; <fix>`.
- Tag: with `--tag`, check that tag with `remote-tag`; else the script returns the version, so try `v<version>`, then `<version>` with `remote-tag`; none found → `Stopped: 6: tag-missing: no tag for <version> on origin; push it first, then rerun` (`Next:` says to push the tag, then rerun).
- `release-view` of that tag: it exists (draft or published) → a draft goes back to `## Publish options` only when it was not already shown; a published one → `Result: nothing-to-do`, `Release: <url> (published)`.
- `create-draft` (never `--target`); a failure → `Stopped: 6: draft-failed: <error>`.
- Then ask `## Publish options` (notes question skipped), and `## Publish`.

## Unattended

An unattended run (no user to answer: headless, `-p`, or scheduled) without a user-passed `--yes` → `Result: stopped`, `Stopped: 4: unattended, not confirmed`; nothing is published or drafted, and `Open:` lists the draft to publish. A user-passed `--yes` asks nothing:

- One draft (or `--tag`) → publish it, notes kept, no discussion category, no Marketplace listing; `latest`, or `pre-release` for a version with a pre-release label. `remote-tag` empty (publishing would create the tag) → `Stopped: 5: tag-missing: <tag> is not on origin; push it first`, nothing published; `Open:` lists the draft and the push of its tag.
- Several drafts without `--tag` → `Stopped: 3: ambiguous-drafts: <tags>; pass --tag`.
- No draft → `## Draft new`, then publish with the same kind rule.

## Open items

Collect `Blocked:`, failed `Checks:`, and `Stopped:` into `Open:` with the recommended fix and who acts; change nothing. A stop after a draft was created (`publish-failed`) lists the draft's URL so a rerun picks it up.
