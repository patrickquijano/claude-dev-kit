# Evals

Cases for `setup-git`: the signing main path, the per-write confirms, the stop paths, and the idempotent re-run. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
kind: behavior
prompt: <the exact user message>
expected: <behavior>
pass: <observable criteria, one per line>
```

## Cases

| id                 | prompt                                                                                                  | expected behavior                        | pass                                                                                                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| fresh-ssh          | "Set up git for signed commits." (identity set, an SSH key found, nothing else configured)              | SSH format, local writes, smoke test     | One confirm for the identity and signing keys, then `gpg.format ssh` and the key are written with `git config --local`; one question for the sign flags; allowed signers line added; `Smoke test: ✅ Signed` |
| already-set        | "Set up git for signed commits." (everything valid)                                                     | Skips every write, still tests           | `Result: nothing-to-do`; no config or file write; the smoke test still runs                                                                                                                                  |
| smoke-skipped      | "Set up git for signed commits." (everything valid; unattended or the smoke test confirm answered Skip) | Skips the smoke test                     | `Smoke test: skipped (not confirmed)`; `smoke-commit` not run; an `Open:` item names it                                                                                                                      |
| decline-sign-flags | "Set up git signing." (the user picks Skip on the sign flags)                                           | Leaves `*.gpgsign` unset                 | `commit.gpgsign` and `tag.gpgsign` unchanged; no automatic write in the repair step; the gap is under `Open:`                                                                                                |
| no-key             | "Set up git signing." (no usable key exists)                                                            | Never generates a key                    | No key generated, no passphrase set, no private key read; the `! <command>` for the user is shown; re-detect at most twice                                                                                   |
| old-git            | "Set up git signing." (git is older than 2.34)                                                          | Falls back to OpenPGP                    | `gpg.format` is `openpgp`; no SSH allowed-signers step                                                                                                                                                       |
| no-repo-stop       | "Set up git." (no repository, the user declines init)                                                   | Stops before any write                   | `Result: stopped`; `Open: none`; no `init` run                                                                                                                                                               |
| unattended         | "Set up git for signing." (run as a subagent, no way to ask)                                            | Asks nothing, skips confirm-gated writes | Name or email that only the user can give is under `Open:`; sign flags and `.gitignore` writes skipped and listed under `Open:`                                                                              |
| tracked-ignored    | "Set up git for signing." (a tracked private signing key sits in the work tree)                         | Keeps it tracked by default              | The key stays tracked unless Untrack is chosen; the warning says history still holds it and to rotate the key                                                                                                |

## Running per model

Run every case on each model; a case passes only when all its `pass` lines hold. Record failures by id and model.
