# Preflight

Steps 1–3 detail. Commands run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`.

## Pre-flight (step 1)

Per `${CLAUDE_SKILL_DIR}/../prepare-change-request/references/<host>.md` `## Pre-flight`, but a dirty tree is recorded, not just noted: keep the `dirty-paths` paths as Dirty. Then stop if any of `MERGE_HEAD`, `rebase-merge`, `rebase-apply`, `CHERRY_PICK_HEAD`, `REVERT_HEAD`, `BISECT_LOG` exists under `git-path` for that name. Read repo instructions (CLAUDE.md, `.claude/rules/`, CONTRIBUTING, commitlint config) to follow them. Signing per conventions.md `## Signing`; missing → stop and say what to set.

## Find CR (step 2)

`$ARGUMENTS`: an optional number (strip `#` or `!`), `--self-review`, `--yes`; anything else → stop. Per the host `## Find`: the CR must be open; another author's CR → AskUserQuestion `Continue (co-author)` | `Cancel` (`--yes` continues; `--yes` without a number and no branch match → stop). Else the host `## Candidates`: spawn `cdk:cr-feedback-collector` with host, mode `discover`, Self, `${CLAUDE_SKILL_DIR}/references/state.md`, and the scratch paths of the candidate data; none → `Result: nothing-to-do`; else AskUserQuestion, up to 4 CRs by `updated` desc (label `#<n> <title>`, description `<head> → <base>, <reason>`), none marked recommended, typed numbers must be in the list.

## Branch guard (step 3)

Read the state file (`${CLAUDE_SKILL_DIR}/references/state.md` `## State file`) first. Per the host `## Branch` (remote, head ref, expected head SHA, fork handling). `fetch-head`. Current ≠ head branch → switch only when no Dirty path differs between them (`head-diff-names` ∩ Dirty = ∅), else stop; a head branch not yet local → `switch-track`. Behind → `pull-ff`; diverged → stop. Ahead of `<remote>/<head>` is allowed only when every commit in `<remote>/<head>..HEAD` is a Self commit the state file records in `commits[]` (an earlier run committed without pushing); otherwise stop. Keep `headSha = remote-head-sha`; it must equal the host's head SHA re-read after the fetch, else stop ("push or pull first").
