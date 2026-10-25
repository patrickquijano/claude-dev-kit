# Allowed signers

Details step 8 (**Allowed signers**).

Without it `git verify-commit` and `git log --show-signature` fail locally. AskUserQuestion: `$HOME/.config/git/allowed_signers` (Recommended; creates or edits a file in your home directory, a personal trust store reused by every repo, per git docs) | `.git/allowed_signers` (this clone only) | Skip (local signature checks such as `git verify-commit` and signing pre-commit checks fail without it). Append `<email> namespaces="git" <public key line>` when missing, creating the file and directory, then set `gpg.ssh.allowedSignersFile`. Unattended: no question; use `.git/allowed_signers` (never a home-directory file), and when the public key line is unavailable skip and list under `Open:`.
