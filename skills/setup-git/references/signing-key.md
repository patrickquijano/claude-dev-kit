# Signing key

Details step 6 (**Signing key**) candidate flow. Commands run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`.

- SSH: candidates are `~/.ssh/*.pub` plus `agent-keys` keys; ed25519 first. Exactly one candidate → use it and report it. Several → AskUserQuestion: each candidate (up to 3, first Recommended) | Generate a new key. Generate → print `! ssh-keygen -t ed25519 -C "<email>" -f ~/.ssh/id_ed25519_signing`, wait, re-detect. Value per git docs: `.pub` path when `agent-keys` lists that key; private key path (`.pub` stripped) when not; `key::<public key line>` for agent-only keys with no file (1Password, Secretive, FIDO).
- OpenPGP: `have-gpg` fails → stop ("install GnuPG"). Candidates from `gpg-candidates`: valid (not expired or revoked), signing capability `s`, a UID email equal to `user.email`. One → use it and report it. Several → AskUserQuestion: up to 3, newest Recommended | Generate a new key. None or Generate → print `! gpg --full-generate-key`, wait, re-detect. Value: the long key ID.
