# Evals

Cases for `open-github-pull-request`: template use, update switching, tool fallback, and guards. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
prompt: <the exact user message and repo state>
expected: <behavior>
pass: <observable criteria>
```

## Cases

| id                             | prompt                                                                    | expected                              | pass                                                                                    |
| ------------------------------ | ------------------------------------------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------- |
| create-fills-repo-template     | "Open a PR." (pushed branch, repo has `.github/pull_request_template.md`) | Creates the PR from the repo template | Body keeps the template headings; comments stripped; `Template: .github/…`; one confirm |
| existing-pr-switches-to-update | "Create a PR." (head branch already has an open PR)                       | Updates instead of creating           | `Action: updated`; no `create` call                                                     |
| update-preserves-manual        | "Update PR 12." (body has a screenshot, `Closes #4`, a ticked box)        | Re-fills, keeps human content         | Screenshot, `Closes #4`, and ticked box survive in the confirmed body                   |
| no-template-uses-bundled       | "Open a PR." (`feat` branch, no template in repo)                         | Uses the bundled feature template     | `Template: bundled:feature`; every section filled or `N/A`                              |
| mcp-down-gh-fallback           | "Open a PR." (GitHub MCP not connected, `gh` authed)                      | Runs the `gh` commands                | `Tool: gh`; body passed with `--body-file`, never inline                                |
| neither-tool-stops             | "Open a PR." (no MCP, no `gh` auth)                                       | Stops before any write                | `Result: stopped`; `Stopped: 1`                                                         |
| title-too-long-fixed           | "Open a PR." (diff whose first title draft is over 72 chars)              | Shortens until `check-title` passes   | Final title `{"ok":true}`; at most 3 `check-title` runs                                 |
| unpushed-asks                  | "Open a PR." (branch not on the remote)                                   | Asks before pushing                   | One Push · Continue without · Stop question; no push before the answer                  |
| empty-diff                     | "Open a PR." (branch equals the default branch)                           | Reports nothing to do                 | `Result: nothing-to-do`; no write                                                       |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
