# Smoke test

Details step 10 (**Verify**) smoke test. Commands run by name from `commands.md` in this folder.

Make a dangling signed commit that no branch references: `smoke-commit`, then `smoke-verify`. Pass → `✅ Signed`. SSH with no allowed signers file → instead check `smoke-header` for a `gpgsig` header; present → `✅ Signed (not verifiable locally: no allowed signers)`. Fail → quote the error line as `❌ Signed`, then offer one retry after the user runs: SSH passphrase or agent error → `! ssh-add <private key path>`; OpenPGP pinentry error (`Inappropriate ioctl for device`, `No pinentry`) → `! echo test | gpg --clearsign >/dev/null` to cache the passphrase. Git garbage-collects the object later.
