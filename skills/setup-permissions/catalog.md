# Permission catalog

Classification policy and baseline for `setup-permissions`. Source: <https://code.claude.com/docs/en/permissions>.

## Syntax

- Bash rule = `Bash(<command>)`. A rule with no `*` matches one exact command; a trailing `*` (space, then `*`) matches the command plus any arguments, and also the bare command.
- Write every command as a pair: `Bash(npm)` and `Bash(npm *)`. Never a wildcard-only rule (`Bash`, `Bash(*)`, `Bash(* foo)`): auto mode drops broad code-execution allows, and a `*` before the subcommand warns at startup.
- Subcommand scope: put the `*` after the subcommand (`Bash(git log *)`), so the words before it limit the rule.
- Use the space form, never `:*`. Treat an existing `Bash(x:*)` as equal to `Bash(x *)` when comparing.
- Evaluation is deny, then ask, then allow; first match wins and specificity never reorders. An ask rule overrides a matching allow, so ask carve-outs work inside a program-wide allow. An allow can never carve out of a deny.
- Compound commands split on `&& || ; | |& &` and newlines; deny and ask match any part, allow must match every part.
- Auto mode drops package-manager run wildcards, so each repo script also gets its own exact pair: `Bash(npm run lint)` and `Bash(npm run lint *)`.
- Single rules, not pairs: `Edit(<path>)` rules and `PowerShell(Start-Process * -Verb RunAs)` (its `*` is mid-pattern by design). Every other `Bash` and `PowerShell` command is a pair.
- Platform: Windows → add the `PowerShell(<command>)` forms for the same commands. Each Deny entry is tagged `[unix]`, `[win]`, or untagged (all platforms); skip the other platform's tags.

## Allow

Pair each program. Reason: read-only, or its effects live in the working tree and git restores them.

- Read-only inspection beyond the built-in read-only set: `uname`, `whoami`, `df`, `ps`, `tree`, `file`, `jq`. Skip `rg` and `fd`: `--pre`, `-x`, and `--exec` run arbitrary commands.
- `git`: program pair; the Ask carve-outs move its risky subcommands (reset, clean, push, …) to ask.
- Package managers the analyzer reports (`Package managers`), skipping any missing from `Installed`: `npm`, `pnpm`, `yarn`, `bun`, `pip`, `uv`, `poetry`, `composer`, `go`, `cargo`, `dotnet`, `mvn`, `gradle`, `./gradlew`, `bundle`; their run and exec subcommands are carved out in Ask.
- Every analyzer script or target not in the Ask list: exact pair for the invocation (`npm run <script>`, `make <target>`, `composer <script>`).
- Linters, formatters, type checkers, test and coverage runners, build tools, dev servers, code generators the repo uses (`eslint`, `prettier`, `tsc`, `vitest`, `jest`, `pytest`, `ruff`, `phpunit`, …).
- Containers and CI/DevOps CLIs the analyzer reports as `Installed`: `docker`, `docker compose`, `gh`, `glab`, `kubectl`, `helm`, `terraform`, `act`. Their writes are carved out in Ask, which overrides this allow.

## Ask

Pair each. Reason: may modify, overwrite, reset, clean, or delete content that git or a rebuild can ordinarily restore, or run arbitrary code.

- Git: `git reset --hard`, `git clean`, `git checkout --`, `git restore`, `git stash drop`, `git stash clear`, `git branch -D`, `git branch --delete --force`, `git checkout .`, `git switch --discard-changes`, `git worktree remove`, `git config`, `git -c`, `git rebase`, `git push` (covers every force form; pushing is outward-facing).
- Files: `rm`, `rmdir`, `mv`, `chmod`. Not `find`: it is built-in read-only, and its `-delete` and `-exec` forms already prompt.
- Hosting writes: `gh pr create`, `gh pr merge`, `gh pr review`, `gh pr comment`, `gh pr close`, `gh pr edit`, `gh issue create`, `gh issue comment`, `gh issue close`, `gh release create`, `gh repo delete`, `gh api`, `glab mr create`, `glab mr merge`, `glab mr approve`, `glab mr note`, `glab api`.
- Runners of arbitrary code: `go run`, `cargo run`, `dotnet run`, `uv run`, `bundle exec`, `composer exec`, `composer run-script`, `pip install`, `npm install`, `npm ci`, `npm publish`, `pnpm add`, `pnpm install`, `pnpm publish`, `yarn add`, `yarn install`, `yarn publish`, `cargo install`, `cargo publish`, `go install`, `go generate`, `npx`, `bunx`, `uvx`, `pnpm exec`, `pnpm dlx`, `yarn exec`, `npm exec`, `docker exec`, `docker run`, `docker rm`, `docker rmi`, `docker compose run`, `docker compose exec`, `kubectl exec`, `kubectl cp`, `kubectl edit`, `kubectl patch`, `kubectl port-forward`, `direnv exec`, `env`, `printenv` (the last two expose secrets). The skill's own pre-approved `printenv CLAUDE_CONFIG_DIR` and `printenv OS` are the only exceptions.
- Cleanup: `docker system prune`, `docker volume prune`, `docker image prune`, `docker compose down -v`.
- Infra and cluster changes: `terraform apply`, `terraform destroy`, `kubectl delete`, `kubectl apply`, `helm uninstall`, `helm upgrade`.
- Repo scripts the analyzer marks `destructive`, or named like `clean`, `reset`, `fresh`, `nuke`, `drop`, `migrate:fresh`: exact pair in ask, never allow.
- Anything that cannot be classified safely.

## Never allow

Shells and interpreters (`bash`, `sh`, `zsh`, `fish`, `pwsh`, `cmd`, `python`, `node`, `ruby`, `perl`, `php -r`), `eval`, `xargs`, `curl | sh`, `source`, and bare tool names. They run arbitrary code; a repo that needs one gets an exact-command pair in ask.

## Deny

Pair each, anchored at the program name. Reason: can harm the host, escalate privilege, change protected system locations, or manage disks, users, permissions, services, shutdown, or reboot; git cannot restore any of it.

- Privilege escalation: `sudo`, `su`, `doas`, `pkexec` `[unix]`; `runas`, `gsudo` `[win]`.
- Shutdown and boot: `shutdown`, `reboot`, `halt`, `poweroff`, `init` `[unix]`; `bcdedit` `[win]`; `csrutil`, `nvram` `[unix]`.
- Services: `systemctl`, `service`, `launchctl` `[unix]`; `sc`, `sc.exe` `[win]`.
- Disks: `diskutil`, `fdisk`, `parted`, `mkfs`, `dd`, `mount`, `umount` `[unix]`; `format`, `diskpart` `[win]`.
- Users and permissions: `useradd`, `userdel`, `usermod`, `groupadd`, `passwd`, `chpasswd`, `dscl`, `sysadminctl`, `chown`, `chgrp` `[unix]`; `net user`, `icacls`, `takeown` `[win]`.
- Windows registry: `reg add`, `reg delete` `[win]`.
- Protected locations (file tools): `Edit(//etc/**)`, `Edit(//usr/**)`, `Edit(//bin/**)`, `Edit(//sbin/**)`, `Edit(//System/**)`, `Edit(//Library/**)` `[unix]`. Windows system-directory Edit rule: skip until its path form is verified.
- PowerShell elevation: `PowerShell(Start-Process * -Verb RunAs)` `[win]`.

## Precedence

- `rm`, `git reset --hard`, and `git clean` stay in ask, not deny: git restores tracked content, and a deny blocks legitimate cleanup.
- Deny only at the program name, never mid-pattern (`Bash(* sudo *)`): a deny matches any part of a compound command and would block commands that merely mention the word.
- A deny and an allow for the same program cannot coexist: the deny wins everywhere, so skip the new allow and report it `conflicting`; the user may confirm removing the deny (`SKILL.md` step 4), otherwise it stays.
- An existing rule always stays; only a rule the user confirms is moved. An existing allow that a new ask or deny covers is retained and reported `conflicting`: the stricter list still wins at evaluation.
