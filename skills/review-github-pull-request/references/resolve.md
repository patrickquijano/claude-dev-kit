# Resolve

Steps 1–2 of `SKILL.md`. Any failure → print the exact error line and stop.

## Pre-flight

Run in order:

1. `auth-status` succeeds, else tell the user to run `gh auth login`.
2. `origin` (Context → Origin) host is `github.com`; any other host → stop: "this skill reviews GitHub PRs only".
3. `repo-view` → Owner and Repo of the working directory (kept for a number or branch match). `self` → Self.
4. Scratch = the session scratchpad directory plus `review-<n>`; created by the first Write.

## Resolve

- A URL argument `https://github.com/<owner>/<repo>/pull/<n>` → use its owner, repo, and number (it may differ from the working directory); run `pr-resolve-url`.
- A number argument (strip `#`) → `pr-resolve-url` in the working directory's repo.
- No argument → `pr-for-branch` with Context → Branch. Detached or `<none>` branch, or no open PR for it → `Result: nothing-to-do`.
- Never fall back to another PR, a list, or a guess; an argument that is neither a URL nor a number → stop.

## State rules

- `MERGED` or `CLOSED` → `Result: nothing-to-do`, `Stopped: resolve: PR is <state>`; post nothing.
- `isDraft` true → continue; the verdict is never `APPROVE`: `COMMENT`, or `REQUEST_CHANGES` when the rules require it (`analyze.md` `## Verdict`).
- Keep: owner, repo, number, URL, title, author login, head SHA (`headRefOid`, the full 40 characters), base ref, and `isCrossRepository`. A fork PR is read-only and reviewed the same way, since nothing is checked out.
- Own PR = author login equals Self; `post.md` `## Own PR` covers it.
