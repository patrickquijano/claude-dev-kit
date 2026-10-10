---
name: setup-git
description: Set up a git repository for signed, verified commits and a complete .gitignore. Initialize the repo, configure identity and SSH or OpenPGP commit signing in local config, validate and repair existing identity and signing settings until they are consistent, smoke-test a signature, and add stack, secret, OS, and editor ignores, applying recommended defaults and asking only for identity, signing key or format conflicts, allowed signers location, untracking, and the repo root when it is not the current directory. Use only when the user explicitly asks to set up, initialize, or configure git, git identity, commit or tag signing, SSH or GPG signing, verified commits, or .gitignore, or when cdk:setup-project chains it. Do not use on your own after finishing a task.
allowed-tools: Bash(git rev-parse *) Bash(git --version) Bash(git config --get *) Bash(git config --local --get *) Bash(git log -1 *) Bash(git ls-files *) Bash(git check-ignore *) Bash(git cat-file *) Bash(ssh-add -L) Bash(ssh-keygen -l -f *.pub) Bash(gpg --list-secret-keys *) Bash(command -v *)
---

# Setup Git

## Rules

- Idempotent: a valid setting in any scope (`true` for the sign keys), or an ignore pattern already present, is skipped. An invalid or inconsistent effective value is repaired (step 9). `nothing-to-do` = no config, file, or ignore write happened; the smoke test still runs.
- Writes go to local config (`git config --local`), because the user asked for repo-level setup; never write `--global` or `--system` config. Local config overrides global and system, so an invalid inherited value is repaired by writing a local value; a valid inherited value is left alone.
- Never guess an identity, key, or format: ask (AskUserQuestion with detected candidates) whenever more than one valid fix exists or the value cannot be derived; auto-fix only a single mechanical repair (a `*.gpgsign` flag, a missing allowed signers line).
- Never read, print, or copy a private key; never run `ssh-keygen -y`. Public key lines come only from `<path>.pub`, a `key::` value, or `ssh-add -L`. Never generate a key or set a passphrase for the user: give the `! <command>` for the user to run, then re-detect.
- Caps: re-detect after a user-run command at most twice per step, then stop; the smoke test retries once; each identity value (steps 4 and 9) is asked at most 3 times (empty or invalid reply re-asks), then stop; step 9 runs one repair pass and step 10 allows one more, then stop.
- AskUserQuestion: at most 4 questions per call, 2–4 options each; recommended option first with its reason. Free-text values with no 2 real options (name, email) → ask in plain text and wait for the reply.
- Never commit, push, or untrack files without an explicit choice.
- Path catalog: `${CLAUDE_SKILL_DIR}/ignores.md`.
- Any Stop answer or failure → print the Output with `Stopped: <step>: <reason>` and end.
- Chained by `cdk:setup-project` via the Skill tool; never set `disable-model-invocation: true` (it blocks that invocation).
- AskUserQuestion or Write unavailable: follow `${CLAUDE_SKILL_DIR}/../build-skill/fallbacks.md`.
- Final step: follow `${CLAUDE_SKILL_DIR}/../build-skill/resolve-findings.md` (scope: edit; sources: `Verify:` inconsistent, `Smoke test:` ❌, `Tracked but ignored:`, `Repaired:` leftovers).
- Known issues: follow `${CLAUDE_SKILL_DIR}/../build-skill/known-issues.md` with slug `setup-git`.

## Workflow

1. **Pre-flight.** `git --version` fails → stop ("install git"). Record the version; SSH signing needs git ≥ 2.34.
2. **Repository.** `git rev-parse --show-toplevel` fails → run `git init` in `<cwd>` (signing and ignores need a repo; respects `init.defaultBranch`). Root is not cwd (for example a home-directory repo) → AskUserQuestion: Use `<root>` (Recommended; git writes local config there) | Stop. Work from the git root.
3. **Detect.** For each key run `git config --get --show-scope <key>`: `user.name`, `user.email`, `gpg.format`, `user.signingkey`, `commit.gpgsign`, `tag.gpgsign`, `gpg.ssh.allowedSignersFile`, `gpg.program`, `gpg.ssh.program`, `gpg.x509.program`; then `git config --local --get <key>` for each to see which values are local. Unset `gpg.format` means `openpgp`. Record each value's scope for the Output.
4. **Identity.** Unset `user.name` or `user.email` → ask in plain text; an empty reply, or an email without `@`, re-asks (cap in Rules). When a commit exists, show `git log -1 --format='%an%n%ae'` as "last commit author" and ask the user to confirm it is them; in a clone it is often someone else. Say the email must be a verified email on the forge account, else the forge marks commits unverified.
5. **Signing format.** `gpg.format` set in any scope → keep (step 9 validates it). Else set `ssh` (reuses an SSH key, no GPG agent, GitLab and GitHub verify it); git < 2.34 → set `openpgp` (SSH signing needs git ≥ 2.34).
6. **Signing key.** Keep `user.signingkey` when it is valid for the format: its file exists, or it is a `key::` value listed by `ssh-add -L`, or (OpenPGP) `gpg --list-secret-keys <value>` succeeds. Unset, missing, or unknown (step 9 also routes here) →
   - SSH: candidates are `~/.ssh/*.pub` plus `ssh-add -L` keys; ed25519 first. Exactly one candidate → use it and report it. Several → AskUserQuestion: each candidate (up to 3, first Recommended) | Generate a new key. Generate → print `! ssh-keygen -t ed25519 -C "<email>" -f ~/.ssh/id_ed25519_signing`, wait, re-detect. Value per git docs: `.pub` path when `ssh-add -L` lists that key; private key path (`.pub` stripped) when not; `key::<public key line>` for agent-only keys with no file (1Password, Secretive, FIDO).
   - OpenPGP: `command -v gpg` fails → stop ("install GnuPG"). Candidates from `gpg --list-secret-keys --keyid-format=long --with-colons`: valid (not expired or revoked), signing capability `s`, a UID email equal to `user.email`. One → use it and report it. Several → AskUserQuestion: up to 3, newest Recommended | Generate a new key. None or Generate → print `! gpg --full-generate-key`, wait, re-detect. Value: the long key ID.
7. **Sign by default.** Set each of `commit.gpgsign` and `tag.gpgsign` not already `true` to `true` (release tags become verifiable; every `git tag <name>` becomes a signed annotated tag and asks for a message).
8. **Allowed signers.** SSH only; `gpg.ssh.allowedSignersFile` set and its file lists `<email>` with the signing public key → skip. Without it `git verify-commit` and `git log --show-signature` fail locally. AskUserQuestion: `~/.config/git/allowed_signers` (Recommended; creates or edits a file in your home directory, a personal trust store reused by every repo, per git docs) | `.git/allowed_signers` (this clone only) | Skip (`cdk:setup-husky` stops without it). Append `<email> namespaces="git" <public key line>` when missing, creating the file and directory, then set `gpg.ssh.allowedSignersFile`.
9. **Validate and repair.** Re-check the effective values from steps 3-8 and fix each failing check locally (Rules). Every changed value goes on the `Repaired:` line.
   - Identity: `user.name` empty, or `user.email` not `<text>@<text>` or containing whitespace → ask in plain text (cap in Rules).
   - Format: `gpg.format` not `openpgp`, `x509`, or `ssh`, or `ssh` on git < 2.34 → AskUserQuestion: the format that matches the current signing key's type (Recommended; keeps the key) | each other valid format this git supports.
   - Key type vs format: a `key::` value, a value starting `ssh-`, or an SSH key path with format `openpgp` or `x509`; or a hex key ID, fingerprint, or email with format `ssh` → AskUserQuestion: Switch `gpg.format` to match the key (Recommended; keeps your existing key) | Choose another key for the current format (step 6 candidates).
   - Key exists: SSH key file missing, `key::` value not in `ssh-add -L`, or OpenPGP key unknown to `gpg --list-secret-keys` → step 6 candidate flow; the chosen key replaces the value locally. A `.pub` key file must also pass `ssh-keygen -l -f <path>.pub`.
   - OpenPGP identity: no UID of the signing key equals `user.email` → AskUserQuestion: Set `user.email` to a UID email of the key (Recommended; the forge verifies commits by the key's UID email) | Use another key whose UID matches | Keep as is (commits show unverified).
   - Sign flags: `commit.gpgsign` or `tag.gpgsign` not `true` (including `false` or an invalid boolean) → set `true` (effects in step 7).
   - Allowed signers (SSH): `gpg.ssh.allowedSignersFile` unset, its file missing, or no line lists `<email>` with the signing public key → step 8.
   - Programs: `gpg.program` (openpgp), `gpg.x509.program` (x509), or `gpg.ssh.program` (ssh) set for the active format but `command -v <value>` fails → AskUserQuestion: Set the local value to the default (`gpg`, `gpgsm`, `ssh-keygen`; Recommended; a missing custom program breaks every signed commit) | Stop to fix it yourself.
10. **Verify.** Re-read every key from step 3 with `git config --get --show-scope` and re-run the step 9 checks; each must pass (one more repair pass if not, cap in Rules), and the values must agree: valid format, key type matches the format, key exists, valid `user.email` (a UID of an OpenPGP key), both sign flags `true`, allowed signers lists the key (SSH). Then the smoke test: make a dangling signed commit that no branch references: `tree=$(git mktree </dev/null)`, `git commit-tree -S -m "signing test" "$tree"`, then `git verify-commit <sha>`. Pass → `✅ Signed`. SSH with no allowed signers file → instead check `git cat-file commit <sha>` for a `gpgsig` header; present → `✅ Signed (not verifiable locally: no allowed signers)`. Fail → quote the error line as `❌ Signed`, then offer one retry after the user runs: SSH passphrase or agent error → `! ssh-add <private key path>`; OpenPGP pinentry error (`Inappropriate ioctl for device`, `No pinentry`) → `! echo test | gpg --clearsign >/dev/null` to cache the passphrase. Git garbage-collects the object later.
11. **Ignore candidates.** Find catalog markers at the root and one level down: `git ls-files --cached --others --exclude-standard -- '<marker>' '*/<marker>'` per marker, so unignored dependency folders never flood the list. `*.py` counts only at the root. Collect patterns of detected stacks plus the always-on groups. Drop patterns already in the target ignore file, and drop paths that exist and `git check-ignore -q` already ignores. None left → skip to step 14.
12. **Choose ignores.** Take the catalog-Recommended groups among the candidates, no question; target `.gitignore` (every clone gets it). None Recommended → skip to step 14.
13. **Write ignores.** Append chosen groups to the target, creating it if missing, each under a `# <Group>` comment; keep existing lines and order; write a pattern shared by several chosen groups once. Editors: for each tracked file under `.vscode/`, add `!.vscode/<file>` after `.vscode/*` so shared files stay tracked.
14. **Tracked but ignored.** `git ls-files -ci --exclude-standard` lists tracked files that now match an ignore pattern. None → skip. Else AskUserQuestion: Keep tracked (Recommended; untracking deletes the file in other clones on their next pull) | Untrack with `git rm --cached` (files stay on disk; you commit the removal). A listed file matches the Secrets group → warn that history still holds it, so rotate the secret.
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
Resolution: <n> resolved, <m> open (<id: reason; recommended fix>, …), <k> accepted | none | not run (stopped)
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
