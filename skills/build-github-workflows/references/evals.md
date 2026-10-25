# Evals

Cases for `build-github-workflows`: the create path, the single plan approval, the stop and unattended paths, and the spawn fallbacks. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
kind: behavior
prompt: <the exact user message>
expected: <behavior>
pass: <observable criteria, one per line>
```

## Cases

| id                 | prompt                                                                                      | expected behavior                                     | pass                                                                                                                                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------- | ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| create-ci          | "Write CI workflows for this Node repo: lint and test on pull requests." (no workflows yet) | Create mode, one orchestrator plus one callee per job | `Mode: create`; plan mode entered; the plan lists the files; files only under `.github/workflows/`, `.github/actions/`, `.github/dependabot.yml`; no `secrets: inherit`; versions are exact tags from the resolution table |
| update-minimal     | "Add a build job to .github/workflows/ci.yml." (existing workflow)                          | Update mode, only what the request needs              | `Mode: update`; the diff of the existing file is printed before the plan approval; triggers and existing job `name` values are unchanged                                                                                   |
| user-stops         | "Write a release workflow." (the user declines plan mode)                                   | Writes nothing                                        | No file written; `Result: stopped`, `Stopped: 8: plan mode declined`; no workflow run, push, or PR                                                                                                                         |
| unattended         | "Write CI workflows for this repo." (run as a subagent, no way to ask)                      | Skips the ask and writes only settled items           | Plan mode `skipped (unattended)`; each unanswered item is under `Open:` and `Assumptions:`; nothing guessed                                                                                                                |
| plan-rejected-3x   | "Add a deploy workflow." (the user rejects the plan 3 times)                                | Revises each time, then cancels                       | Plan approval requested again after each rejection; no file written; `Result: cancelled`                                                                                                                                   |
| unpinnable-version | "Pin everything to the latest." (a runner or action tag cannot be verified)                 | Asks or stops, never uses a remembered value          | No `latest`, bare major, or `ubuntu-latest` written; the item is asked about or listed under `Unresolved:`                                                                                                                 |
| resolver-down      | "Write CI workflows." (the version-resolution subagent cannot be spawned)                   | Resolves inline                                       | Versions come from the `versions.md` procedure; the table still has a source URL per row                                                                                                                                   |
| verify-cap         | "Write CI workflows." (a review `error` persists after fixes)                               | Stops fixing after 3 attempts                         | Exactly 3 fix attempts; the finding is under `Open:`; `Stopped: 9: verify cap`; the report still prints                                                                                                                    |

## Running per model

Run every case on each model; a case passes only when all its `pass` lines hold. Record failures by id and model.
