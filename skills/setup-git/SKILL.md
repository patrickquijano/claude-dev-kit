---
name: setup-git
description: Set up a git repository for signed, verified commits and a complete .gitignore. Configure identity and SSH or OpenPGP signing in local config, repair inconsistent settings, and smoke-test a signature. Use only when the user explicitly asks to set up git, commit signing, or .gitignore, or when cdk:setup-project chains it. Do not use on your own after finishing a task.
allowed-tools: Bash(git rev-parse *) Bash(git --version) Bash(git config --get *) Bash(git config --local --get *) Bash(git log -1 *) Bash(git ls-files *) Bash(git check-ignore *) Bash(git cat-file *) Bash(ssh-add -L) Bash(ssh-keygen -l -f *.pub) Bash(gpg --list-secret-keys *) Bash(command -v *)
---

# Setup Git

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`
- Git version: !`git --version 2>/dev/null || echo '<none>'`

A Context value of `<none>` means that read failed. A missing value or `[shell command execution disabled by policy]` means run that command's `commands.md` row instead.

## Rules

- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Idempotent: a valid setting in any scope (`true` for the sign keys), or an ignore pattern already present, is skipped. An invalid or inconsistent effective value is repaired (step 9). `nothing-to-do` = no config, file, or ignore write happened; the smoke test still runs.
- Writes go to local config (`git config --local`), because the user asked for repo-level setup; never write `--global` or `--system` config. Local config overrides global and system, so an invalid inherited value is repaired by writing a local value; a valid inherited value is left alone.
- Never guess an identity, key, or format: ask (AskUserQuestion with detected candidates) whenever more than one valid fix exists or the value cannot be derived; auto-fix only a single mechanical repair (a `*.gpgsign` flag, a missing allowed signers line).
- Never read, print, or copy a private key; never run `ssh-keygen -y`. Public key lines come only from `<path>.pub`, a `key::` value, or `ssh-add -L`. Never generate a key or set a passphrase for the user: give the `! <command>` for the user to run, then re-detect.
- Caps: re-detect after a user-run command at most twice per step, then stop; the smoke test retries once; each identity value (steps 4 and 9) is asked at most 3 times (empty or invalid reply re-asks), then stop; step 9 runs one repair pass and step 10 allows one more, then stop.
- AskUserQuestion: at most 4 questions per call, 2–4 options each; recommended option first with its reason. Free-text values with no 2 real options (name, email) → ask in plain text and wait for the reply.
- Never commit, push, or untrack files without an explicit choice.
- Path catalog: `${CLAUDE_SKILL_DIR}/references/ignores.md`.
- Pre-flight stops (step 1) and Stop answers (cancels) → print the Output with `Resolution: not run (stopped | cancelled)`, `Stopped: <step>: <reason>`, and end. Any later failure or cap → run step 15 (**Resolve findings.**) on what is left, without re-entering the loop, then print the Output with `Stopped: <step>: <reason>`.
- Chained by `cdk:setup-project` via the Skill tool; never set `disable-model-invocation: true` (it blocks that invocation).
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/../shared/references/fallbacks.md`.
- Final step: follow `${CLAUDE_SKILL_DIR}/../shared/references/resolve-findings.md` (scope: edit; sources: `Verify:` inconsistent, `Smoke test:` ❌, `Tracked but ignored:`, `Repaired:` leftovers, `Ignores:` uncovered stacks or skipped groups, an unverifiable smoke test).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../shared/references/known-issues.md` with slug `setup-git` and store `${CLAUDE_PLUGIN_DATA}/known-issues`.

## Workflow

1. **Pre-flight.** Context Git version `<none>` → stop ("install git"). Record it; SSH signing needs git ≥ 2.34.
2. **Repository.** Context Repo root `<none>` → run `init` in `<cwd>` (signing and ignores need a repo; respects `init.defaultBranch`). Root is not cwd (for example a home-directory repo) → AskUserQuestion: Use `<root>` (Recommended; git writes local config there) | Stop. Work from the git root.
3. **Detect.** For each key run `config-get`: `user.name`, `user.email`, `gpg.format`, `user.signingkey`, `commit.gpgsign`, `tag.gpgsign`, `gpg.ssh.allowedSignersFile`, `gpg.program`, `gpg.ssh.program`, `gpg.x509.program`; then `config-local` for each to see which values are local. Unset `gpg.format` means `openpgp`. Record each value's scope for the Output.
4. **Identity.** Unset `user.name` or `user.email` → ask in plain text; an empty reply, or an email without `@`, re-asks (cap in Rules). When a commit exists, show `last-author` as "last commit author" and ask the user to confirm it is them; in a clone it is often someone else. Say the email must be a verified email on the forge account, else the forge marks commits unverified.
5. **Signing format.** `gpg.format` set in any scope → keep (step 9 validates it). Else set `ssh` (reuses an SSH key, no GPG agent, GitLab and GitHub verify it); git < 2.34 → set `openpgp` (SSH signing needs git ≥ 2.34).
6. **Signing key.** Keep `user.signingkey` when it is valid for the format: its file exists, or it is a `key::` value listed by `agent-keys`, or (OpenPGP) `gpg-key` succeeds. Unset, missing, or unknown (step 9 also routes here) → pick a candidate. Detail: `${CLAUDE_SKILL_DIR}/references/signing-key.md`.
7. **Sign by default.** Set each of `commit.gpgsign` and `tag.gpgsign` not already `true` to `true` (release tags become verifiable; every `git tag <name>` becomes a signed annotated tag and asks for a message).
8. **Allowed signers.** SSH only; `gpg.ssh.allowedSignersFile` set and its file lists `<email>` with the signing public key → skip. Otherwise ask where to store it and append the line. Detail: `${CLAUDE_SKILL_DIR}/references/allowed-signers.md`.
9. **Validate and repair.** Re-check the effective values from steps 3-8 and fix each failing check locally (Rules). Every changed value goes on the `Repaired:` line. Checks: `${CLAUDE_SKILL_DIR}/references/validate.md`.
10. **Verify.** Re-read every key from step 3 with `config-get` and re-run the step 9 checks; each must pass (one more repair pass if not, cap in Rules), and the values must agree: valid format, key type matches the format, key exists, valid `user.email` (a UID of an OpenPGP key), both sign flags `true`, allowed signers lists the key (SSH). Then the smoke test (`smoke-tree`, `smoke-commit`, `smoke-verify`): pass → `✅ Signed`; SSH without allowed signers, or failure: `${CLAUDE_SKILL_DIR}/references/smoke-test.md`.
11. **Ignore candidates.** Find catalog markers at the root and one level down: `ls-markers` per marker, so unignored dependency folders never flood the list. `*.py` counts only at the root. Collect patterns of detected stacks plus the always-on groups. Drop patterns already in the target ignore file, and drop paths that exist and `check-ignore` already ignores. None left → skip to step 14.
12. **Choose ignores.** Take the catalog-Recommended groups among the candidates, no question; target `.gitignore` (every clone gets it). None Recommended → skip to step 14.
13. **Write ignores.** Append chosen groups to the target, creating it if missing, each under a `# <Group>` comment; keep existing lines and order; write a pattern shared by several chosen groups once. Editors: for each tracked file under `.vscode/`, add `!.vscode/<file>` after `.vscode/*` so shared files stay tracked.
14. **Tracked but ignored.** `tracked-ignored` lists tracked files that now match an ignore pattern. None → skip. Else AskUserQuestion: Keep tracked (Recommended; untracking deletes the file in other clones on their next pull) | Untrack with `git rm --cached` (files stay on disk; you commit the removal). A listed file matches the Secrets group → warn that history still holds it, so rotate the secret.
15. **Resolve findings.** Per resolve-findings.md. Do not re-ask what steps 4–14 already asked; a value only the user can supply (identity, key, untracking) stays `needs-decision`, and a signing failure that needs a user-run command is reported with that `! <command>`.
16. **Report** the output below. Signing key set up or changed in step 6 or 9 → add the forge step: upload the signing public key (SSH: GitLab User settings > SSH Keys, usage Signing or Authentication & Signing; GitHub Settings > SSH and GPG keys, type Signing Key. OpenPGP: `gpg --armor --export <key id>` to the GPG keys page).

## Output

```text
Repository: <root> (<existing | initialized>)
Git: <version>
Identity: user.name <value> (<scope | set local>), user.email <value> (<…>)
Repaired: <key old → new (reason), … | none>
Signing: format <ssh | openpgp | x509> (<…>), key <path | key:: | key id> (<…>), commit.gpgsign <…>, tag.gpgsign <…>
Allowed signers: <file> (<added | up to date | skipped | n/a>)
Verify: <consistent | inconsistent: <check>>
Smoke test: ✅ Signed | ✅ Signed (not verifiable locally) | ❌ Signed: <error line>
Ignores: <file: added groups>, … | up to date (skipped not-Recommended groups: <names> | none; uncovered stacks: <names> | none)
Tracked but ignored: <files> (<kept | untracked>) | none
Next: upload the signing public key to your forge account | none
Resolution: <n> resolved, <m> open (<id: severity, reason; recommended fix>, …), <k> accepted | none | not run (nothing-to-do | cancelled | stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
