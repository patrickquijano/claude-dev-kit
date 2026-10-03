---
name: setup-git
description: Set up a git repository for signed, verified commits and a complete .gitignore. Initialize the repo, configure identity and SSH or OpenPGP commit signing in local config, smoke-test a signature, and add stack, secret, OS, and editor ignores, applying recommended defaults and asking only for identity, signing key, allowed signers location, untracking, and the repo root when it is not the current directory. Use only when the user explicitly asks to set up, initialize, or configure git, git identity, commit or tag signing, SSH or GPG signing, verified commits, or .gitignore, or when cdk:setup-project chains it. Do not use on your own after finishing a task.
allowed-tools: Bash(git rev-parse *) Bash(git --version) Bash(git config --get *) Bash(git log -1 *) Bash(git ls-files *) Bash(git check-ignore *) Bash(git cat-file *) Bash(ssh-add -L) Bash(gpg --list-secret-keys *) Bash(command -v *)
---

# Setup Git

## Rules

- Idempotent: a setting with a value in any scope (`true` for the sign keys), or an ignore pattern already present, is skipped. `nothing-to-do` = no config, file, or ignore write happened; the smoke test still runs.
- Writes go to local config (`git config --local`), because the user asked for repo-level setup; never write `--global` or `--system` config.
- Never read, print, or copy a private key; never run `ssh-keygen -y`. Public key lines come only from `<path>.pub`, a `key::` value, or `ssh-add -L`. Never generate a key or set a passphrase for the user: give the `! <command>` for the user to run, then re-detect.
- Caps: re-detect after a user-run command at most twice per step, then stop; the smoke test retries once; each identity value (step 4) is asked at most 3 times (empty or invalid reply re-asks), then stop.
- AskUserQuestion: at most 4 questions per call, 2–4 options each; recommended option first with its reason. Free-text values with no 2 real options (name, email) → ask in plain text and wait for the reply.
- Never commit, push, or untrack files without an explicit choice.
- Path catalog: `${CLAUDE_SKILL_DIR}/ignores.md`.
- Any Stop answer or failure → print the Output with `Stopped: <step>: <reason>` and end.
- Chained by `cdk:setup-project` via the Skill tool; never set `disable-model-invocation: true` (it blocks that invocation).
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/fallbacks.md`.
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `setup-git`.

## Workflow

1. **Pre-flight.** `git --version` fails → stop ("install git"). Record the version; SSH signing needs git ≥ 2.34.
2. **Repository.** `git rev-parse --show-toplevel` fails → run `git init` in `<cwd>` (signing and ignores need a repo; respects `init.defaultBranch`). Root is not cwd (for example a home-directory repo) → AskUserQuestion: Use `<root>` (Recommended; git writes local config there) | Stop. Work from the git root.
3. **Detect.** For each key run `git config --get --show-scope <key>`: `user.name`, `user.email`, `gpg.format`, `user.signingkey`, `commit.gpgsign`, `tag.gpgsign`, `gpg.ssh.allowedSignersFile`. Unset `gpg.format` means `openpgp`. Record each value's scope for the Output.
4. **Identity.** Unset `user.name` or `user.email` → ask in plain text; an empty reply, or an email without `@`, re-asks (cap in Rules). When a commit exists, show `git log -1 --format='%an%n%ae'` as "last commit author" and ask the user to confirm it is them; in a clone it is often someone else. Say the email must be a verified email on the forge account, else the forge marks commits unverified.
5. **Signing format.** `gpg.format` set in any scope → keep. Else set `ssh` (reuses an SSH key, no GPG agent, GitLab and GitHub verify it); git < 2.34 → set `openpgp` (SSH signing needs git ≥ 2.34).
6. **Signing key.** Keep `user.signingkey` when its file exists, or it is a `key::` value listed by `ssh-add -L`, or (OpenPGP) `gpg --list-secret-keys <value>` succeeds. Else:
   - SSH: candidates are `~/.ssh/*.pub` plus `ssh-add -L` keys; ed25519 first. AskUserQuestion: each candidate (up to 3, first Recommended) | Generate a new key. Generate → print `! ssh-keygen -t ed25519 -C "<email>" -f ~/.ssh/id_ed25519_signing`, wait, re-detect. Value per git docs: `.pub` path when `ssh-add -L` lists that key; private key path (`.pub` stripped) when not; `key::<public key line>` for agent-only keys with no file (1Password, Secretive, FIDO).
   - OpenPGP: `command -v gpg` fails → stop ("install GnuPG"). Candidates from `gpg --list-secret-keys --keyid-format=long --with-colons`: valid (not expired or revoked), signing capability `s`, a UID email equal to `user.email`. One → use it. Several → AskUserQuestion: up to 3, newest Recommended | Generate a new key. None or Generate → print `! gpg --full-generate-key`, wait, re-detect. Value: the long key ID.
7. **Sign by default.** Set each of `commit.gpgsign` and `tag.gpgsign` not already `true` to `true` (release tags become verifiable; every `git tag <name>` becomes a signed annotated tag and asks for a message).
8. **Allowed signers.** SSH only; `gpg.ssh.allowedSignersFile` set and its file lists `<email>` with the signing public key → skip. Without it `git verify-commit` and `git log --show-signature` fail locally. AskUserQuestion: `~/.config/git/allowed_signers` (Recommended; creates or edits a file in your home directory, a personal trust store reused by every repo, per git docs) | `.git/allowed_signers` (this clone only) | Skip. Append `<email> namespaces="git" <public key line>` when missing, creating the file and directory, then set `gpg.ssh.allowedSignersFile`.
9. **Smoke test.** Make a dangling signed commit that no branch references: `tree=$(git mktree </dev/null)`, `git commit-tree -S -m "signing test" "$tree"`, then `git verify-commit <sha>`. Pass → `✅ Signed`. SSH with no allowed signers file → instead check `git cat-file commit <sha>` for a `gpgsig` header; present → `✅ Signed (not verifiable locally: no allowed signers)`. Fail → quote the error line as `❌ Signed`, then offer one retry after the user runs: SSH passphrase or agent error → `! ssh-add <private key path>`; OpenPGP pinentry error (`Inappropriate ioctl for device`, `No pinentry`) → `! echo test | gpg --clearsign >/dev/null` to cache the passphrase. Git garbage-collects the object later.
10. **Ignore candidates.** Find catalog markers at the root and one level down: `git ls-files --cached --others --exclude-standard -- '<marker>' '*/<marker>'` per marker, so unignored dependency folders never flood the list. `*.py` counts only at the root. Collect patterns of detected stacks plus the always-on groups. Drop patterns already in the target ignore file, and drop paths that exist and `git check-ignore -q` already ignores. None left → skip to step 13.
11. **Choose ignores.** Take the catalog-Recommended groups among the candidates, no question; target `.gitignore` (every clone gets it). None Recommended → skip to step 13.
12. **Write ignores.** Append chosen groups to the target, creating it if missing, each under a `# <Group>` comment; keep existing lines and order; write a pattern shared by several chosen groups once. Editors: for each tracked file under `.vscode/`, add `!.vscode/<file>` after `.vscode/*` so shared files stay tracked.
13. **Tracked but ignored.** `git ls-files -ci --exclude-standard` lists tracked files that now match an ignore pattern. None → skip. Else AskUserQuestion: Keep tracked (Recommended; untracking deletes the file in other clones on their next pull) | Untrack with `git rm --cached` (files stay on disk; you commit the removal). A listed file matches the Secrets group → warn that history still holds it, so rotate the secret.
14. **Report** the output below. Signing key set up or changed in step 6 → add the forge step: upload the signing public key (SSH: GitLab User settings > SSH Keys, usage Signing or Authentication & Signing; GitHub Settings > SSH and GPG keys, type Signing Key. OpenPGP: `gpg --armor --export <key id>` to the GPG keys page).

## Output

```text
Repository: <root> (<existing | initialized>)
Git: <version>
Identity: user.name <value> (<scope | set local>), user.email <value> (<…>)
Signing: format <ssh | openpgp> (<…>), key <path | key:: | key id> (<…>), commit.gpgsign <…>, tag.gpgsign <…>
Allowed signers: <file> (<added | up to date | skipped | n/a>)
Smoke test: ✅ Signed | ✅ Signed (not verifiable locally) | ❌ Signed: <error line>
Ignores: <file: added groups>, … | up to date (skipped not-Recommended groups: <names> | none; uncovered stacks: <names> | none)
Tracked but ignored: <files> (<kept | untracked>) | none
Next: upload the signing public key to your forge account | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
