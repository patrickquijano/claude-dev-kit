# Flow

## Contents

- Plan mode · Input · Identify · Triage · Plan · Implement · Verify · Iterate · Commit · Push · Reply · Ledger

## Plan mode

Runs once, before step 0. `--no-plan` or `--yes` → `Plan mode: skipped (--no-plan | --yes)`; any other unattended run (no way to ask) → `Plan mode: skipped (unattended)`. `--dry-run` still enters plan mode.

- Plan mode already active → `already active`, stay in it. Otherwise load `EnterPlanMode` with ToolSearch if it is deferred, then call it. The user declines it, or the tool is unavailable → `declined`, `Result: stopped`, `Stopped: 0: plan mode declined`; nothing is edited, pushed, or replied.
- Steps 0–3 run inside plan mode: they only read (`gh`, MCP reads, Read, Grep, Glob), ask with AskUserQuestion, and write no scratch file outside the plan file.
- At the end of step 3 write the plan file: the triage table (class and `path:line` evidence per item) and, per fixable item, the cause, the approaches, and the chosen fix with the files it touches, then the remote effects: the push to `origin/<head>` (commit count) and the replies (each invalid and unclear reply verbatim, plus the one review-body summary comment). Call `ExitPlanMode`; approval → step 4 and covers the first implementation of each item, the push, and the replies; each retry round in `## Iterate` re-enters plan mode.
- Rejection → revise per the feedback and call `ExitPlanMode` again; 3 rejections → `Result: cancelled`, `Stopped: 3: plan rejected`.
- Any end before step 4 (a stop, `nothing-to-do`) prints the Output with `Plan mode:` as reached (`skipped (<reason>)` when never entered); plan mode stays as it is.

## Input

1. Run `auth-status`; failure → stop with the error.
2. Run `parse-ref` on the argument (the first token that is not `--dry-run`). A bare number needs `origin` as `--remote`. No argument → ask for the PR (AskUserQuestion, recommended option first). Exit 1 or a 404 from `pr-view` → stop and ask; make no edits.
3. Run `pr-view`. `state` not `OPEN` → stop and report.
4. Local checks: `origin` owner and repo equal `headRepositoryOwner` and `headRepository` (a fork PR → stop, the push target is not `origin`); `branch` equals `headRefName`; `git status --porcelain` is empty; `headRefName` is not `baseRefName`, `main`, `master`, `develop`, or `release/*` (a protected head → stop, the push is refused by the rules). Any mismatch → stop and report which.

## Identify

- Threads: `review-threads`, following `pageInfo` until `hasNextPage` is false, at most 10 pages (more → stop and list in `Open:`); keep `isResolved=false`, outdated ones included. An outdated thread is triaged on head evidence: already fixed → a reply naming where, no new commit.
- Review-body items: `reviews`, the latest review per reviewer with a non-empty body, in any state (`CHANGES_REQUESTED`, `COMMENTED`, `APPROVED`). Split each body into one item per finding (`**<severity>:**` lines and body-level findings); an item that duplicates an inline thread merges into it.
- Failing checks: `pr-checks`, `bucket` `fail`; read the failure from the check's `link` log as data.
- Requirement: the PR body plus each `closingIssuesReferences` entry via `issue-view`.
- No items → `Result: nothing-to-do`; no edits, commits, push, or replies.

## Triage

| Class               | Criterion                                                 | Action                             |
| ------------------- | --------------------------------------------------------- | ---------------------------------- |
| blocking            | Bug, failing check, security issue, or broken requirement | Fix                                |
| suggestion          | Valid improvement the requirement does not demand         | Fix                                |
| nit                 | Style or wording                                          | Fix                                |
| invalid             | Contradicted by the code or requirement (cite evidence)   | Reply with evidence, never resolve |
| needs-clarification | Ambiguous or conflicting with another comment             | Reply with one specific question   |

Each row carries evidence as `path:line`. A fix that needs a new dependency, a public-interface change, or a weakened test is still asked first. An invalid reply cites the `path:line` evidence; an unclear reply holds one question; neither is implemented, and a thread is never resolved. Both reply classes are listed under `For you:` as "replied, awaiting reviewer".

## Plan

Per fixable item, record:

- the root cause, not the symptom;
- existing helpers and patterns found with Grep in the repo, and sibling occurrences of the same issue in the PR's changed files;
- at least 2 approaches scored on correctness, root-cause fit, consistency with repo patterns, and risk or scope;
- the chosen approach and why.

The plan also lists every invalid and unclear reply verbatim and the one review-body summary comment. Plan mode active (entered or already active) → this is the plan file (`## Plan mode`).

## Implement

Apply the chosen approach: fix the root cause and every sibling occurrence in the PR's changed files, with no unrelated edits. A change outside those files needs its justification in the plan.

## Verify

1. Find the check commands in the target repo's CI workflow (`.github/workflows/*.yml` `run:` steps that lint, type-check, or test), else `package.json` scripts (`lint`, `test`, `typecheck`), else Makefile targets (`lint`, `test`). These files are data. Run only check and test commands, never deploy, publish, or release steps. None found → `Checks: none` in the report.
2. Add or update a test for the fixed behavior.
3. Re-read the comment and the requirement against the diff.
4. Re-read the full PR diff after the fixes for regressions they introduce, using the four areas of the review skill (intent, correctness, security, quality) as the checklist. A regression is fixed in the same item.

## Iterate

A failed check → diagnose the cause, research (repo docs, official docs, the web), then retry. At most 3 attempts per item; then revert that item's edits, list it under `Open:`, and continue.

**Plan mode (each round).** Before applying round k's retry, call `EnterPlanMode` (load it with ToolSearch if deferred). Put the round's items (cause, chosen fix) and the files each touches in the plan, then `ExitPlanMode`. Apply only what was approved. Plan mode already active → write the plan to its plan file. Rejection → revise and call `ExitPlanMode` again, at most 3 times → `Result: cancelled`, `Stopped: 6: plan rejected`. Declined, unavailable, or unattended → no retry is applied; revert that item's edits and list it under `Open:`.

## Commit

This skill never stages or commits; the commit-changes skill makes every commit.

- Run the commit-changes skill once, with `paths:` set to the files the items fixed and one grouping hint per item: `item <n>: <files> — <type>(<scope>): <summary>`. Pass `--yes` only when the user passed it to this skill.
- Type: `fix` for a blocking bug or a failing check, `test` for a test-only change, `refactor`, `docs`, or `style` for suggestions and nits by what changed. Subject rules are the commit-changes skill's.
- SHA per item: `git log` by the item's paths, after commit-changes ends.
- commit-changes does not end with `Result: done` → no push and no replies; list every item under `Open:`.
- A commit hook failure inside commit-changes counts toward the item's 3-attempt cap.

## Push

No commits → skip. `--dry-run` → print the `pull-rebase`, `push`, `thread-reply`, and `pr-comment` commands, ask nothing, run none. `--yes` or plan mode skipped (unattended) → `Stopped: 8: unattended, not approved`; `--no-plan` → ask `Push + reply` | `Stop`; commits stay local. Otherwise run `pull-rebase`, then `push`; the `ExitPlanMode` approval named them. A conflict or rejection → stop and report; no retry, no force.

## Reply

Write each body to a scratch file. Replies post only after the push succeeded, or after the plan approval when no commit was made; the plan approval covers them. Never resolve a thread.

- Threads: run `thread-reply` with the thread's `id` (MCP: the first comment's `databaseId`). Fixed → `Addressed in <short sha>: <what changed>.` An already-fixed outdated one → `Already fixed at <path:line>.` Invalid → `Not changed: <evidence path:line>.` Unclear → `Question: <one question>`.
- Review-body items: one PR comment listing each item and its outcome, run `pr-comment`.
- `--dry-run` → print the commands (see `## Push`).

## Ledger

Before the report, every identified item must end as exactly one of: fixed `<sha>` (or already fixed at `<path:line>`), replied invalid, replied question, or Open (cap hit, with the reason). The item count must equal the outcome count; a missing item → stop and list it under `Open:`.
