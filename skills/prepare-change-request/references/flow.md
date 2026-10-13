# Flow details

## Contents

- Pre-flight · Target · Range · Template · Draft · Confirm · Open items

## Pre-flight

Detect the host (Rules), then run the host file `## Pre-flight`; keep Repo or Project, Root, Branch, Self, Scratch. Branch is the default or a protected branch (`conventions.md` `## Protected branch`) → stop, suggest `/cdk:switch-branch`.

## Target

`--target <b>` → the remote-branch list must hold exactly one ref whose branch part is `<b>` (several remotes → stop, name them; none → stop). Else Target = the default, no ask. No default found → print the list and ask with the four most recent branches plus Other (a typed value must be in the list, else re-ask within the cap). GitHub: the selected ref's remote must match Repo (`github.md` `## Remote branches`). Target = its branch part; the target ref is `<remote>/<branch>`.

## Range

`mb` = `merge-base`; none → stop. `range-count` = 0 → `no commits vs <target>`, `Result: nothing-to-do`. Then the release gate (`release-gate.md`); when it added commits, recompute `mb` and the range. With the Write tool (scratch only) save `range-diff`, `range-name-status`, `range-log` to `<scratch>/diff.patch`, `name-status.txt`, `log.txt`. Push need: no upstream, upstream not on the target's remote, or `unpushed-count` > 0 → push required (host file `## Write`), else none.

## Template

`--template` resolves per the host file `## Templates`; unresolved → stop. Else infer the kind (no ask) from the branch prefix, then the dominant subject type in `<scratch>/log.txt`: `fix/` → Bugfix, `hotfix/` → Hotfix, `release/` → Release, `docs/` → Documentation, other → Default. Repository templates come first, the bundled `${CLAUDE_SKILL_DIR}/assets/templates/<Kind>.md` last. Keep its text and source (`explicit`, `repository`, `bundled`). Update path: the body is kept, so only the managed block is drafted.

## Draft

Create path, or an update whose title fails the title rules: spawn `cdk:change-analyzer` with root, `mode=cr-summary`, head (current branch), `<target ref>`, the template body, input hints, and `${CLAUDE_SKILL_DIR}/references/conventions.md`. Take `Title` and, on create, `Description` (template filled from commits and diff; quick actions stripped). `Empty: yes` → as the Range nothing-to-do exit. `Questions` non-empty → AskUserQuestion, respawn once with the answers. Run `commitlint` on `Title`; fail → respawn with the error lines (cap in Rules). Update with a passing title → keep it, no spawn.

Then the managed block: summary from each reviewer `Summary`, per-role status and counts, commands with exit codes, medium and low findings, gating findings reported under `--gate report` (labeled open), and limitations, including any reviewer with `Status: incomplete`. Create body: filled template plus the block appended; update body: only the block replaced (appended when absent), per the host file `## Managed section`. Write `<scratch>/title` and `<scratch>/body.md`.

## Confirm

`--yes` → take the recommended effect without asking. Else one AskUserQuestion naming each effect: push required → `Push + Create CR` (Recommended) | Revise | Cancel; no push → `Create CR` (Recommended) | Revise | Cancel; update → `Update CR` (keep title, recommended unless the title fails) | `Update CR + title`, each prefixed `Push +` when a push is needed, plus Revise and Cancel. Name the CR `PR` or `MR` by host. Revise → back to the step the user names (cap in Rules). Cancel → `Result: cancelled`, nothing written.

## Open items

Ask-only: edit and post nothing. List each item in `Open:` with impact, recommended fix, and who acts: medium and low findings, `Dropped findings`, `Excluded:`, reviewers with `Status: incomplete`, failed or skipped checks, `Template: bundled`, `Commitlint:` skipped or failed, `Release: failed`, a verify mismatch, and gating findings reported under `--gate report`. A gating finding at the Gate step ends the run `stopped` and is listed the same way. No items → `Open: none`.
