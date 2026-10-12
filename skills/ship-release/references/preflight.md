# Pre-flight

Details step 1 (**Pre-flight**). Commands run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`.

Context → Git, Node, and npx version present (not `<none>`), plus `gh-version` (GitHub) or `glab-version` (GitLab). Repo root = Context → Repo root. No merge, rebase, or detached HEAD in progress (the states `hooks/scripts/git-state.mjs` treats as unsafe). Auth ok (`gh-auth` or `glab-auth`). Signing set per `${CLAUDE_SKILL_DIR}/../commit-changes/references/conventions.md` `## Signing` (missing → blocker `signing`, not a stop). Target = `--target`, else `.claude/release-policy.json` `defaultBranch`, else `default-branch` without `origin/`. `fetch`. Any failure so far → blocker; a pre-flight stop prints `Resolution: not run (stopped)` and ends the run. Otherwise write the hold marker last, at the absolute path `marker-path` with the Write tool; the plugin's end-of-task hook skips this tree until step 10 deletes it.
