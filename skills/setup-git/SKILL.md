---
name: setup-git
description: 'Sets up git for signed commits and .gitignore: identity, SSH or OpenPGP signing, and a signature smoke test. Use only when the user explicitly asks to set up git or signing, or when chained.'
allowed-tools: Bash(git rev-parse *) Bash(git --version) Bash(git config --get *) Bash(git config --local --get *) Bash(git log -1 *) Bash(git ls-files *) Bash(git check-ignore *) Bash(git cat-file *) Bash(git verify-commit *) Bash(ssh-add -L) Bash(ssh-keygen -l -f *.pub) Bash(gpg --list-secret-keys *) Bash(command -v *)
---

# Setup Git

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`
- Git version: !`git --version 2>/dev/null || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `commands.md` row.

## Rules

- Rigor: never guess or invent: confirm each path, command, and fact by reading it; ask (unattended: record) what the input and repo cannot answer. Finish every step in full, think twice before each irreversible step, and re-check the result against these rules and the repo's standards before reporting.
- Efficiency: read only what a step needs, keep output terse, and take the fewest steps that meet the goal.
- Confirm effects: before `init`, the sign-flag writes, and the `.gitignore` writes, AskUserQuestion once each, naming the effect (Init repo in `<cwd>` | Stop; Set `commit.gpgsign` + `tag.gpgsign` true locally | Skip; Append `<groups>` to `.gitignore` | Skip), recommended first. Unattended: skip the write and list it under `Open:`.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Idempotent: a valid setting in any scope (`true` for the sign keys) or an ignore pattern already present is skipped. An invalid or inconsistent effective value is repaired (step 9). `nothing-to-do` = no config, file, or ignore write happened; the smoke test still runs.
- Writes go to local config (`git config --local`); never `--global` or `--system`. Local overrides inherited values, so an invalid inherited value is repaired by a local write; a valid one is left alone.
- Identity, key, or format: ask (AskUserQuestion with detected candidates) when more than one valid fix exists or the value cannot be derived; auto-fix only a single mechanical repair (a `*.gpgsign` flag, a missing allowed signers line).
- Never read, print, or copy a private key; never run `ssh-keygen -y`. Public key lines come only from `<path>.pub`, a `key::` value, or `ssh-add -L`. Never generate a key or set a passphrase: give the `! <command>` for the user to run, then re-detect.
- Never commit, push, or untrack files without an explicit choice.
- Caps: re-detect after a user-run command twice per step; smoke test retry once; each identity value asked 3 times (empty or invalid reply re-asks); repair passes 2 (step 9 one, step 10 one more). Cap hit → stop and list what is left under `Open:`.
- AskUserQuestion: at most 4 questions per call, 2-4 options each, recommended first with its reason. Free text with no 2 real options (name, email) → ask in plain text. AskUserQuestion or Write unavailable → ask the pending question as plain text with its options, end the turn, take the next message as the answer.
- Unattended (chained by `cdk:setup-project` with no way to ask): ask nothing; a value only the user can supply goes under `Open:`.
- Pre-flight stops and cancels print the Output with `Open: none` and end. Any later failure or cap prints `Open:` with each leftover (`Verify:` inconsistent, `Smoke test:` failed, tracked but ignored, uncovered stacks) and its recommended fix.

## Workflow

1. **Pre-flight.** Context Git version `<none>` → stop ("install git"). SSH signing needs git 2.34 or later.
2. **Repository.** Root `<none>` → confirm, then `init` in `<cwd>` (declined: stop; chained from `cdk:setup-project`: its ask is the consent, so `init` without asking; other unattended: stop). Root is not cwd → AskUserQuestion: Use `<root>` (Recommended; git writes local config there) | Stop; unattended: stop. Work from the root.
3. **Detect.** `config-get` each key: `user.name`, `user.email`, `gpg.format`, `user.signingkey`, `commit.gpgsign`, `tag.gpgsign`, `gpg.ssh.allowedSignersFile`, `gpg.program`, `gpg.ssh.program`, `gpg.x509.program`; `config-local` to see local ones. Unset `gpg.format` = `openpgp`.
4. **Identity.** Unset `user.name` or `user.email` → ask in plain text (cap in Rules). With a commit, show `last-author` and ask whether it is the user (unattended: skip this question). The email must be verified on the forge account.
5. **Signing format.** Set in any scope → keep. Else set `ssh`; git < 2.34 → `openpgp`.
6. **Signing key.** Keep `user.signingkey` when valid for the format; else pick a candidate. Detail: `${CLAUDE_SKILL_DIR}/references/signing-key.md`.
7. **Sign by default.** Set `commit.gpgsign` and `tag.gpgsign` to `true` when not already, after confirming (every `git tag <name>` becomes a signed annotated tag and asks for a message).
8. **Allowed signers.** SSH only; file set and lists `<email>` with the key → skip. Else ask where to store it and append (unattended: `.git/allowed_signers`, or skip and list under `Open:`). Detail: `${CLAUDE_SKILL_DIR}/references/allowed-signers.md`.
9. **Validate and repair.** Re-check steps 3-8 values and fix each failure locally; list changes under `Repaired:`. Checks: `${CLAUDE_SKILL_DIR}/references/validate.md`.
10. **Verify.** Re-read every key and re-run the step 9 checks (one more repair pass if any fail). Then `smoke-commit`, `smoke-verify`: pass → `✅ Signed`. Failure or SSH without allowed signers: `${CLAUDE_SKILL_DIR}/references/smoke-test.md`.
11. **Ignore candidates.** `ls-markers` per catalog marker (root and one level down; `*.py` root only). Collect patterns of detected stacks plus always-on groups; drop present or `check-ignore`d ones. None left → step 14. Catalog: `${CLAUDE_SKILL_DIR}/references/ignores.md`.
12. **Choose ignores.** Take the catalog-Recommended groups among the candidates; target `.gitignore`; confirm the write. None or declined → step 14.
13. **Write ignores.** Append each group under a `# <Group>` comment, creating the file if missing; keep existing lines; a pattern shared by groups is written once. Tracked files under `.vscode/` → add `!.vscode/<file>` after `.vscode/*`.
14. **Tracked but ignored.** `tracked-ignored` empty → skip. Else AskUserQuestion: Keep tracked (Recommended; untracking deletes the file in other clones on pull) | Untrack with `git rm --cached` (you commit the removal); unattended: keep tracked and list under `Open:`. A Secrets-group match → warn history still holds it; rotate the secret.
15. **Report.** Print the Output. Key set up or changed in step 6 or 9 → `Next:` forge upload (SSH: GitLab User settings > SSH Keys, usage Signing; GitHub Settings > SSH and GPG keys, Signing Key. OpenPGP: `gpg --armor --export <key id>` to the GPG keys page).

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For picking an SSH or OpenPGP signing key (step 6), see `${CLAUDE_SKILL_DIR}/references/signing-key.md`.
- For the allowed signers file (step 8), see `${CLAUDE_SKILL_DIR}/references/allowed-signers.md`.
- For the validation checks and repairs (steps 9-10), see `${CLAUDE_SKILL_DIR}/references/validate.md`.
- For smoke test failures and the SSH no-allowed-signers case (step 10), see `${CLAUDE_SKILL_DIR}/references/smoke-test.md`.
- For stack markers and ignore patterns (steps 11-13), see `${CLAUDE_SKILL_DIR}/references/ignores.md`.

## Output

```text
Repository: <root> (<existing | initialized>)
Git: <version>
Identity: user.name <value> (<scope | set local>), user.email <value> (<...>)
Repaired: <key old -> new (reason), ... | none>
Signing: format <ssh | openpgp | x509> (<...>), key <path | key:: | key id> (<...>), commit.gpgsign <...>, tag.gpgsign <...>
Allowed signers: <file> (<added | up to date | skipped | n/a>)
Verify: <consistent | inconsistent: <check>>
Smoke test: ✅ Signed | ✅ Signed (not verifiable locally) | ❌ Signed: <error line>
Ignores: <file: added groups>, ... | up to date (skipped groups: <names> | none; uncovered stacks: <names> | none)
Tracked but ignored: <files> (<kept | untracked>) | none
Next: upload the signing public key to your forge account | none
Open: <item: reason; recommended fix>, ... | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
