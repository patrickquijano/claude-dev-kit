# Commands

| Name              | Command                                                           | Purpose                                          |
| ----------------- | ----------------------------------------------------------------- | ------------------------------------------------ |
| `git-version`     | `git --version`                                                   | Git installed and version (preloaded in Context) |
| `toplevel`        | `git rev-parse --show-toplevel`                                   | Repository root (preloaded in Context)           |
| `init`            | `git init`                                                        | Initialize the repo                              |
| `config-get`      | `git config --get --show-scope <key>`                             | Effective value and scope                        |
| `config-local`    | `git config --local --get <key>`                                  | Local-only value                                 |
| `last-author`     | `git log -1 --format='%an%n%ae'`                                  | Last commit author                               |
| `agent-keys`      | `ssh-add -L`                                                      | Public keys in the SSH agent                     |
| `ssh-key-check`   | `ssh-keygen -l -f <path>.pub`                                     | Validate a public key file                       |
| `have-gpg`        | `command -v gpg`                                                  | GnuPG installed                                  |
| `gpg-key`         | `gpg --list-secret-keys <value>`                                  | Key known to GnuPG                               |
| `gpg-candidates`  | `gpg --list-secret-keys --keyid-format=long --with-colons`        | OpenPGP key candidates                           |
| `program-exists`  | `command -v <value>`                                              | Configured program resolves                      |
| `smoke-commit`    | `git commit-tree -S -m "signing test" "$(git mktree </dev/null)"` | Dangling signed commit on the empty tree         |
| `smoke-verify`    | `git verify-commit <sha>`                                         | Verify the signature                             |
| `smoke-header`    | `git cat-file commit <sha>`                                       | Look for `gpgsig` header                         |
| `check-ignore`    | `git check-ignore -q <path>`                                      | Path already ignored                             |
| `tracked-ignored` | `git ls-files -ci --exclude-standard`                             | Tracked files now ignored                        |
