# Signing Artifact Ignores

Only signing artifacts that sit inside the work tree are ignore candidates; other stacks and files are out of scope.

| Artifact                | Source                                                                                  | Pattern written                             |
| ----------------------- | --------------------------------------------------------------------------------------- | ------------------------------------------- |
| Allowed signers file    | `gpg.ssh.allowedSignersFile` path, when it resolves under the repo root                 | root-relative path, e.g. `/allowed_signers` |
| SSH private signing key | `user.signingkey` path with no `.pub` suffix and no `key::` prefix, under the repo root | root-relative path                          |

- Skip a path that `check-ignore` already reports ignored.
- Write each pattern once, under a `# Signing` comment; keep existing lines.
- A listed artifact that `tracked-ignored` reports as tracked: warn that history still holds it and that a private key must be rotated.
