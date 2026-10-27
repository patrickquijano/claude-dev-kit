---
name: setup-git
description: 'Sets up git for signed commits: identity, SSH or OpenPGP signing, a signature smoke test, and ignore lines for signing artifacts only. Use only when the user explicitly asks to set up git or signing.'
compatibility: Claude Code only. Uses disable-model-invocation and CLAUDE_SKILL_DIR; claude.ai and API uploads reject unknown frontmatter keys.
allowed-tools: Bash(git rev-parse *) Bash(git --version) Bash(git config --get *) Bash(git config --local --get *) Bash(git log -1 *) Bash(git ls-files *) Bash(git check-ignore *) Bash(git cat-file *) Bash(git verify-commit *) Bash(ssh-add -L) Bash(ssh-keygen -l -f *.pub) Bash(gpg --list-secret-keys *) Bash(command -v *)
disable-model-invocation: true
---

# Setup Git

## Context

- Repo root: !`git rev-parse --show-toplevel 2>/dev/null || echo '<none>'`
- Git version: !`git --version 2>/dev/null || echo '<none>'`

`<none>` = that read failed. A missing value or `[shell command execution disabled by policy]` = run the `commands.md` row.

## Rules

- Ask (unattended: record) what the input and repo cannot answer.
- Commands: run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`; never alter flags.
- Idempotent: a valid setting in any scope (`true` for the sign keys) or an ignore pattern already present is skipped. An invalid or inconsistent effective value is repaired (step 9). `nothing-to-do` = no config, file, or ignore write happened; the smoke test still runs once confirmed.
- Writes go to local config (`git config --local`); never `--global` or `--system`. An invalid inherited value is repaired by a local write; a valid one is left alone.
- Identity, key, or format: ask (AskUserQuestion with detected candidates) when more than one valid fix exists or the value cannot be derived; auto-fix only a single mechanical repair (a missing allowed signers line). A `*.gpgsign` write is never automatic: it is always part of the approved plan, in step 7 or step 9.
- Never read, print, or copy a private key; never run `ssh-keygen -y`. Public key lines come only from `<path>.pub`, a `key::` value, or `ssh-add -L`. Never generate a key or set a passphrase: give the `! <command>` for the user to run, then re-detect.
- Scope: signing is the job (steps 1-10). The `.gitignore` steps (11-14) only cover signing artifacts inside the work tree and run after the signing outcome is final; they never change the signing `Result:` or `Verify:`, and a failure or decline there goes under `Open:`.
- Never commit, push, or untrack files without an explicit choice.
- Caps: re-detect after a user-run command twice per step; smoke test retry once; each identity value asked 3 times (empty or invalid reply re-asks); repair passes 2 (step 9 one, step 10 one more). Cap hit → stop and list what is left under `Open:`.
- Decision questions: at most 4 per call, 2-4 options each, the Recommended first in the call. Grill (decision questions only; gates keep their form): mine the conversation, files, and repo first, ask only what changes the output, and never fill a gap with an assumption. Use the structured-question tool (discover its name and limits at runtime; inside a delegated subagent ask in the main thread before delegating; unavailable → a numbered inline list, then stop for the answer). A fact-dependent question gets one web search per topic, official docs preferred, URLs cited; no search tool or source → "unverified", never an invented fact, source, or number. Before each question show the score table, the recommendation, and the option descriptions per `${CLAUDE_SKILL_DIR}/references/grill.md`. Free text with no 2 real options (name, email) → ask in plain text. Write unavailable → ask the pending question as plain text with its options, end the turn, take the next message as the answer.
- Unattended (no way to ask): ask nothing; a value only the user can supply goes under `Open:`.
- Pre-flight stops and cancels print the Output with `Open: none` and end. Any later failure or cap prints `Open:` with each leftover (`Verify:` inconsistent, `Smoke test:` failed or skipped, tracked but ignored) and its recommended fix.

## Workflow

0. **Plan mode.** Enter plan mode first (load `EnterPlanMode` with ToolSearch if deferred; already active → stay in it); read-only steps run inside it. Before creating, editing, or deleting any file or running any side-effect action, present the plan and wait for `ExitPlanMode` approval. Declined or unavailable → `Result: stopped`, `Stopped: 0: plan mode declined`; nothing is written.
1. **Pre-flight.** Context Git version `<none>` → stop ("install git"). SSH signing needs git 2.34 or later.
2. **Repository.** Root `<none>` → `init` in `<cwd>`. Root is not cwd → AskUserQuestion: Use `<root>` (Recommended; git writes local config there) | Stop; unattended: stop. Work from the root.
3. **Detect.** `config-get` each key: `user.name`, `user.email`, `gpg.format`, `user.signingkey`, `commit.gpgsign`, `tag.gpgsign`, `gpg.ssh.allowedSignersFile`, `gpg.program`, `gpg.ssh.program`, `gpg.x509.program`; `config-local` to see local ones. Unset `gpg.format` = `openpgp`.
4. **Identity.** Unset `user.name` or `user.email` → ask in plain text (cap in Rules). With a commit, show `last-author` and ask whether it is the user (unattended: skip this question).
5. **Signing format.** Set in any scope → keep. Else set `ssh`; git < 2.34 → `openpgp`.
6. **Signing key.** Keep `user.signingkey` when valid for the format; else pick a candidate; write steps 4-6 values. Detail: `${CLAUDE_SKILL_DIR}/references/signing-key.md`.
7. **Sign by default.** Set `commit.gpgsign` and `tag.gpgsign` to `true` when not already (every `git tag <name>` becomes a signed annotated tag and asks for a message).
8. **Allowed signers.** SSH only; file set and lists `<email>` with the key → skip. Else ask where to store it and append (unattended: `.git/allowed_signers`, or skip and list under `Open:`). Detail: `${CLAUDE_SKILL_DIR}/references/allowed-signers.md`.
9. **Validate and repair.** Re-check steps 3-8 values and fix each failure locally; list changes under `Repaired:`. Checks: `${CLAUDE_SKILL_DIR}/references/validate.md`. **Plan mode (each round).** At the start of each iteration, before any fix, enter plan mode (load `EnterPlanMode` with ToolSearch if deferred), present the findings and proposed fixes, and wait for `ExitPlanMode` approval.
10. **Verify.** Re-read every key and re-run the step 9 checks (one more repair pass if any fail, with the step 9 plan-mode round). Then `smoke-commit`, `smoke-verify`: pass → `✅ Signed`. Failure or SSH without allowed signers: `${CLAUDE_SKILL_DIR}/references/smoke-test.md`.
11. **Ignore candidates.** Signing artifacts inside the work tree (allowed signers file, SSH private signing key); drop `check-ignore`d ones. None left → step 14. Detail: `${CLAUDE_SKILL_DIR}/references/ignores.md`.
12. **Choose ignores.** Candidates are the choice; target `.gitignore`. Declined → step 14.
13. **Write ignores.** Append each path under a `# Signing` comment, creating the file if missing; keep existing lines.
14. **Tracked but ignored.** Of the `tracked-ignored` files, only signing artifacts count; none → skip. Else AskUserQuestion: Keep tracked (Recommended; untracking deletes the file in other clones on pull) | Untrack with `git rm --cached` (you commit the removal); unattended: keep tracked and list under `Open:`. A private key → warn history still holds it; rotate the key.
15. **Report.** Print the Output. Key set up or changed in step 6 or 9 → `Next:` upload the public key as a signing key.

## Files

- For every runnable command, see `${CLAUDE_SKILL_DIR}/references/commands.md`.
- For picking an SSH or OpenPGP signing key (step 6), see `${CLAUDE_SKILL_DIR}/references/signing-key.md`.
- For the allowed signers file (step 8), see `${CLAUDE_SKILL_DIR}/references/allowed-signers.md`.
- For the validation checks and repairs (steps 9-10), see `${CLAUDE_SKILL_DIR}/references/validate.md`.
- For smoke test failures and the SSH no-allowed-signers case (step 10), see `${CLAUDE_SKILL_DIR}/references/smoke-test.md`.
- For signing artifact ignores (steps 11-13), see `${CLAUDE_SKILL_DIR}/references/ignores.md`.
- For test prompts and pass criteria, see `${CLAUDE_SKILL_DIR}/references/evals.md`.
- For the grill table, anchors, and sensitivity rule, read `${CLAUDE_SKILL_DIR}/references/grill.md` when a step asks a decision question.

## Output

```text
Repository: <root> (<existing | initialized>)
Git: <version>
Identity: user.name <value> (<scope | set local>), user.email <value> (<...>)
Repaired: <key old -> new (reason), ... | none>
Signing: format <ssh | openpgp | x509> (<...>), key <path | key:: | key id> (<...>), commit.gpgsign <...>, tag.gpgsign <...>
Allowed signers: <file> (<added | up to date | skipped | n/a>)
Plan mode: approved | declined
Verify: <consistent | inconsistent: <check>>
Smoke test: ✅ Signed | ✅ Signed (not verifiable locally) | ❌ Signed: <error line>
Ignores: <file: added paths>, ... | up to date | none needed
Tracked but ignored: <files> (<kept | untracked>) | none
Next: upload the signing public key to your forge account | none
Open: <item: reason; recommended fix>, ... | none
Result: done | nothing-to-do | stopped | cancelled
Stopped: <step>: <reason> | none
```
