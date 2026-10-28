# Evals

Cases for `create-gitlab-issue`: template use, update, guards, and tool routing. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
prompt: <the exact user message and project state>
expected: <behavior>
pass: <observable criteria>
```

## Cases

| id                                           | prompt                                                                                       | expected                           | pass                                                                                                                   |
| -------------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| create-fills-repo-template-with-label-action | "File an issue: login fails on Safari." (project template has `/label ~bug`)                 | Creates from the project template  | Headings kept; `bug` label applied; no body line starts with `/`; `Template: .gitlab/issue_templates/...`; one confirm |
| default-md-picked-when-no-match              | "Open an issue: tidy the docs." (templates `Default.md`, `Bug.md`; no fit)                   | Uses `Default.md`                  | `Template: .gitlab/issue_templates/Default.md`; no template question                                                   |
| no-template-uses-bundled-bug                 | "Report a bug: export drops rows." (no templates in the project)                             | Uses the bundled bug report        | `Template: bundled:bug-report`; `Labels` only if `bug` exists in the project                                           |
| update-by-url-preserves-human-text           | "Update `gitlab.example.com/g/p/-/issues/7`: add the Windows repro." (description has a log) | Re-fills, keeps human content      | Log, screenshots, and ticked boxes survive; before/after shown                                                         |
| update-by-iid                                | "Update #7: retitle to ..." (`origin` is a GitLab project)                                   | Resolves the project from `origin` | `Action: updated`; no create call                                                                                      |
| duplicate-found-asks                         | "Open an issue: dark mode flickers." (open issue with the same title)                        | Asks before creating               | Continue creating · Update #iid · Stop question; no write before the answer                                            |
| missing-repro-steps-asks                     | "Report a bug: it crashes." (no steps given)                                                 | Asks for the steps                 | A question about steps; none invented                                                                                  |
| label-missing-asks-create-or-skip            | "Open a bug issue." (project has no `bug` label)                                             | Asks Create or Skip                | One Create · Skip question; the label is not applied unasked                                                           |
| yes-missing-required-stops                   | "/cdk:create-gitlab-issue --yes crash" (template field with no source)                       | Stops, no assumption               | `Result: stopped`; `Stopped: 5: missing <field>`; no write                                                             |
| mr-url-stops                                 | "Update `gitlab.example.com/g/p/-/merge_requests/3`"                                         | Stops                              | `Result: stopped`; `Stopped: 2: merge request, not an issue`; no write                                                 |
| github-remote-stops                          | "Open an issue." (`origin` is `github.com`)                                                  | Stops                              | `Stopped: 1: no GitLab remote`; no write                                                                               |
| mcp-host-mismatch-uses-glab                  | "Open an issue." (MCP `web_url` host differs from `origin`, `glab` authed)                   | Uses `glab`                        | `Tool: glab`; description passed with `--description-file`, never inline                                               |
| mcp-only-label-create-on-glab                | "Open a bug issue." (MCP connected, `bug` label missing, user picks Create)                  | Creates the label with `glab`      | `Tool: mcp+glab:label-create`                                                                                          |
| neither-tool-stops                           | "Open an issue." (no MCP, no `glab` auth)                                                    | Stops before any write             | `Result: stopped`; `Stopped: 1: no GitLab MCP and no glab auth`                                                        |
| auto-invoke                                  | A natural request to file a GitLab issue, no `/cdk:` command                                 | Claude loads the skill on its own  | The skill runs; its confirm or plan approval still precedes any write                                                  |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
