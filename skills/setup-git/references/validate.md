# Validate

Step 9 (**Validate and repair**) checks. Commands run by name from `commands.md` in this folder.

- Unattended: every AskUserQuestion below takes its Recommended option, except identity and a key mismatch with no single repair, which go under `Open:`.
- Identity: `user.name` empty, or `user.email` not `<text>@<text>` or containing whitespace → ask in plain text (cap in SKILL.md Rules); unattended: list under `Open:`.
- Format: `gpg.format` not `openpgp`, `x509`, or `ssh`, or `ssh` on git < 2.34 → AskUserQuestion: the format that matches the current signing key's type (Recommended; keeps the key) | each other valid format this git supports.
- Key type vs format: a `key::` value, a value starting `ssh-`, or an SSH key path with format `openpgp` or `x509`; or a hex key ID, fingerprint, or email with format `ssh` → AskUserQuestion: Switch `gpg.format` to match the key (Recommended; keeps your existing key) | Choose another key for the current format (step 6 candidates).
- Key exists: SSH key file missing, `key::` value not in `agent-keys`, or OpenPGP key unknown to `gpg-key` → step 6 candidate flow; the chosen key replaces the value locally. A `.pub` key file must also pass `ssh-key-check`.
- OpenPGP identity: no UID of the signing key equals `user.email` → AskUserQuestion: Set `user.email` to a UID email of the key (Recommended; the forge verifies commits by the key's UID email) | Use another key whose UID matches | Keep as is (commits show unverified).
- Sign flags: `commit.gpgsign` or `tag.gpgsign` not `true` (including `false` or an invalid boolean) → step 7 (its single confirmation covers this repair; declined or unattended: leave the value and list it under `Open:`).
- Allowed signers (SSH): `gpg.ssh.allowedSignersFile` unset, its file missing, or no line lists `<email>` with the signing public key → step 8.
- Programs: `gpg.program` (openpgp), `gpg.x509.program` (x509), or `gpg.ssh.program` (ssh) set for the active format but `program-exists` fails → AskUserQuestion: Set the local value to the default (`gpg`, `gpgsm`, `ssh-keygen`; Recommended; a missing custom program breaks every signed commit) | Stop to fix it yourself.
