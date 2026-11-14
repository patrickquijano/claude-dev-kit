# Evals

Cases for `update-dependabot`. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
kind: behavior
prompt: <the exact user message>
expected: <behavior>
pass: <observable criteria, one per line>
```

## Cases

| id | prompt | expected behavior | pass |
| --- | --- | --- | --- |
| new-file | "Set up Dependabot." (npm and Actions, no config) | Creates the file after printing a summary | Summary printed before the write; `npm` and `github-actions` entries; schema check or checklist passes |
| existing-kept | "Update Dependabot." (`.yml` with a user `ignore` rule and a Cargo entry) | Merges in place, keeps user entries | Extension kept; `ignore` and comments untouched; only missing ecosystems added; diff shown in the summary |
| yes-flag | "Set up Dependabot --yes." | No questions, recommended options | No question; assumptions under `Open:`; no existing user entry replaced |
| both-files | "Update Dependabot." (both `.yml` and `.yaml` exist) | Asks which to keep | One question; the other file untouched |
| both-files-yes | "Update Dependabot --yes." (both `.yml` and `.yaml` exist) | Uses the existing file without asking | No question; the tracked file is merged, `.yaml` when both are; the other is untouched and listed under `Open:` |
| stale-key | "Update Dependabot." (file uses a removed key) | Fixes it with a cited reason | Summary names the key and the URL; fix applied directly |
| no-manifests | "Set up Dependabot." (no manifests) | Stops | `Result: nothing-to-do`; no write |
| cannot-interact | "Set up Dependabot." (no way to ask, no `--yes`) | Writes nothing | `Result: stopped`, `Stopped: 0: cannot interact`; no write |
| not-a-repo | "Set up Dependabot." (repo root is `<none>`) | Stops at pre-flight | "not a git repository"; `Result: stopped`; no write |
| no-approval-step | "Set up Dependabot." (npm and Actions, no config) | Runs end to end; every write follows the last decision answer directly | Only the schedule, grouping, cooldown, and prefix questions are asked; the file is written right after the summary prints; `Result: done` |
| grill-close-call | A decision question whose top two totals are 5 or fewer apart | Table before the question; no Recommended | Weights sum to 100; "close call" stated; unverified scores marked |

## Running per model

Run every case on each model; a case passes only when all its `pass` lines hold. Record failures by id and model.
