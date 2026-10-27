# Evals

Cases for `open-gitlab-merge-request`: template use, update switching, tool fallback, remote parsing, and guards. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
prompt: <the exact user message and repo state>
expected: <behavior>
pass: <observable criteria>
```

## Cases

| id                                | prompt                                                                               | expected                                | pass                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------- | ------------------------------------------------------------------------------------------------ |
| create-fills-repo-template        | "Open an MR." (pushed branch, repo has `.gitlab/merge_request_templates/Default.md`) | Creates the MR from the repo template   | Description keeps the template headings; comments stripped; `Template: .gitlab/…`; one confirm   |
| existing-mr-switches-to-update    | "Create an MR." (source branch already has an open MR)                               | Updates instead of creating             | `Action: updated`; no `create` call                                                              |
| update-preserves-manual           | "Update MR 12." (description has a screenshot, `Closes #4`, a ticked box)            | Re-fills, keeps human content           | Screenshot, `Closes #4`, and ticked box survive in the confirmed description                     |
| no-template-uses-bundled          | "Open an MR." (`feat` branch, no template in repo)                                   | Uses the bundled feature template       | `Template: bundled:feature`; every section filled or `N/A`                                       |
| mcp-down-glab-fallback            | "Open an MR." (GitLab MCP not connected, `glab` authed)                              | Runs the `glab` commands                | `Tool: glab`; description passed with `--description-file`, never inline                         |
| neither-tool-stops                | "Open an MR." (no MCP, no `glab` auth)                                               | Stops before any write                  | `Result: stopped`; `Stopped: 1`                                                                  |
| title-too-long-fixed              | "Open an MR." (diff whose first title draft is over 72 chars)                        | Shortens until `check-title` passes     | Final title `{"ok":true}`; at most 3 `check-title` runs                                          |
| unpushed-asks                     | "Open an MR." (branch not on the remote)                                             | Asks before pushing                     | One Push · Continue without · Stop question; no push before the answer                           |
| empty-diff                        | "Open an MR." (branch equals the default branch)                                     | Reports nothing to do                   | `Result: nothing-to-do`; no write                                                                |
| auto-invoke                       | A natural request for the action, no `/cdk:` command                                 | Claude loads the skill on its own       | The skill runs; its existing confirm or plan approval still precedes any write or push           |
| nested-group-self-hosted          | "Open an MR." (`origin` is `git@gitlab.example.com:a/b/c.git`)                       | Resolves host and the full project path | Host `gitlab.example.com`, path `a/b/c`, `<enc>` `a%2Fb%2Fc`; no `a/b` truncation                |
| github-remote-stops               | "Open an MR." (`origin` is `git@github.com:o/r.git`)                                 | Stops at tooling                        | `Result: stopped`; `Stopped: 1: no GitLab remote`; no write                                      |
| several-templates-no-default-asks | "Open an MR." (templates `Bug.md` and `Feature.md`, no `Default.md`)                 | Asks which template                     | One template question; no pick before the answer                                                 |
| default-template-preferred        | "Open an MR." (templates `Bug.md` and `default.md`)                                  | Uses `default.md` without asking        | `Template: .gitlab/merge_request_templates/default.md`; no template question                     |
| auth-403-stops                    | "Open an MR." (`get_project` or `glab api` returns 403)                              | Stops with the fix                      | `Result: stopped`; `Stopped: 1`; fix names `glab auth login --hostname <host>`; no token printed |
| draft-uses-glab                   | "Open a draft MR." (MCP connected for this host)                                     | Uses `glab` for create only             | `Tool: mcp+glab`; `--draft` flag set; title has no `Draft:` prefix                               |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
