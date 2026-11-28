# Commands

| Name | Command | Purpose |
| --- | --- | --- |
| `repo-root` | `git rev-parse --show-toplevel` | Repo root; fail falls back to cwd (preloaded in Context) |
| `tracked-files` | `git ls-files` | Tracked files; inline fallback of the step 3 analyst |
| `remote-url` | `git remote get-url origin` | Host (github, gitlab, bitbucket, gitea, generic); inline fallback of the step 3 analyst |
| `components` | `node ${CLAUDE_SKILL_DIR}/scripts/components.mjs <root>` | Plugin skills, agents, and hook events in full as `name — path — description`; `Components: none (not a plugin)` otherwise (step 3) |
| `count-lines` | `wc -l <files>` | Line count of each written file against the max (step 12) |
