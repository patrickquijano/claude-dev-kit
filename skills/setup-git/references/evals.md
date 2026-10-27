# Evals

Cases for `setup-git`: the signing main path, the plan-mode gate, the stop paths, and the idempotent re-run. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
kind: behavior
prompt: <the exact user message>
expected: <behavior>
pass: <observable criteria, one per line>
```

## Cases

| id                  | prompt                                                                                     | expected behavior                                                           | pass                                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| fresh-ssh           | "Set up git for signed commits." (identity set, an SSH key found, nothing else configured) | SSH format, local writes, smoke test                                        | EnterPlanMode first, one ExitPlanMode approval, then `gpg.format ssh` and the key are written with `git config --local`; allowed signers line added; `Smoke test: ✅ Signed` |
| already-set         | "Set up git for signed commits." (everything valid)                                        | Skips every write, still tests                                              | `Result: nothing-to-do`; no config or file write; the smoke test still runs                                                                                                  |
| no-key              | "Set up git signing." (no usable key exists)                                               | Never generates a key                                                       | No key generated, no passphrase set, no private key read; the `! <command>` for the user is shown; re-detect at most twice                                                   |
| old-git             | "Set up git signing." (git is older than 2.34)                                             | Falls back to OpenPGP                                                       | `gpg.format` is `openpgp`; no SSH allowed-signers step                                                                                                                       |
| no-repo-stop        | "Set up git." (no repository, plan mode declined)                                          | Stops before any write                                                      | `Result: stopped`, `Stopped: 0: plan mode declined`; `Open: none`; no `init` run                                                                                             |
| unattended          | "Set up git for signing." (run as a subagent, no way to ask)                               | Asks nothing, plan mode unavailable, writes nothing                         | `Result: stopped`, `Stopped: 0: plan mode declined`; no config or `.gitignore` write                                                                                         |
| tracked-ignored     | "Set up git for signing." (a tracked private signing key sits in the work tree)            | Keeps it tracked by default                                                 | The key stays tracked unless Untrack is chosen; the warning says history still holds it and to rotate the key                                                                |
| fix-round-plan-mode | "Set up git for signing." (the user rejects the config-write plan)                         | Calls EnterPlanMode before the config write; a rejected plan writes nothing | EnterPlanMode precedes every write; after rejection no config, flag, or `.gitignore` write happens; 3 rejections give `Stopped: <step>: plan rejected`                       |
| grill-close-call    | A decision question whose top two totals are ≤5 apart                                      | Table before the question; no Recommended                                   | Table before the question; integer weights sum to 100; no Recommended; "close call" stated; unverified scores marked                                                         |

## Running per model

Run every case on each model; a case passes only when all its `pass` lines hold. Record failures by id and model.
