# Evals

Cases for `create-github-issue`: template use, update, guards, and tool routing. Test each on Haiku, Sonnet, and Opus.

## Template

```text
id: <kebab-case>
prompt: <the exact user message and repo state>
expected: <behavior>
pass: <observable criteria>
```

## Cases

| id                                 | prompt                                                                            | expected                                 | pass                                                                             |
| ---------------------------------- | --------------------------------------------------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------- |
| create-fills-repo-md-template      | "File an issue: login fails on Safari." (repo has a Markdown bug template)        | Creates from the repo template           | Body keeps the headings; comments stripped; `Template: .github/...`; one confirm |
| create-fills-issue-form-yml        | "Open an issue for a crash." (repo has a YAML issue form)                         | Fills the form as `### <label>` sections | Required fields filled or asked; `markdown` elements skipped                     |
| no-template-uses-bundled-bug       | "Report a bug: export drops rows." (no template in repo or owner `.github`)       | Uses the bundled bug report              | `Template: bundled:bug-report`; `Labels` only if `bug` exists in the repo        |
| owner-dotgithub-fallback           | "Open an issue." (no repo template; owner `.github` repo has one)                 | Uses the owner template                  | `Template: <owner>/.github:<path>`                                               |
| update-by-url-preserves-human-text | "Update `github.com/o/r/issues/7`: add the Windows repro." (body has a log)       | Re-fills, keeps human content            | Log, screenshots, and ticked boxes survive; before/after shown                   |
| update-by-number                   | "Update #7: retitle to ..." (`origin` is a GitHub repo)                           | Resolves the repo from `origin`          | `Action: updated`; no create call                                                |
| duplicate-found-asks               | "Open an issue: dark mode flickers." (open issue with the same title)             | Asks before creating                     | Continue creating · Update #n · Stop question; no write before the answer        |
| missing-repro-steps-asks           | "Report a bug: it crashes." (no steps given)                                      | Asks for the steps                       | A question about steps; none invented                                            |
| label-missing-asks-create-or-skip  | "Open a bug issue." (repo has no `bug` label)                                     | Asks Create or Skip                      | One Create · Skip question; the label is not applied unasked                     |
| yes-missing-required-stops         | "/cdk:create-github-issue --yes crash" (form has a required field with no source) | Stops, no assumption                     | `Result: stopped`; `Stopped: 5: missing <field>`; no write                       |
| pr-url-stops                       | "Update `github.com/o/r/pull/3`"                                                  | Stops                                    | `Result: stopped`; no write                                                      |
| mcp-used-when-available            | "Open an issue." (GitHub MCP connected)                                           | Uses MCP only                            | `Tool: mcp`; no `gh` call                                                        |
| mcp-down-gh-fallback-body-file     | "Open an issue." (MCP not connected, `gh` authed)                                 | Runs the `gh` commands                   | `Tool: gh`; body passed with `--body-file`, never inline                         |
| mcp-partial-gh-for-one-op          | "Open an issue." (MCP has no label-list tool, `gh` authed)                        | Falls back for that operation only       | `Tool: mcp+gh:label-list`                                                        |
| neither-tool-stops                 | "Open an issue." (no MCP, no `gh` auth)                                           | Stops before any write                   | `Result: stopped`; `Stopped: 1`                                                  |
| auto-invoke                        | A natural request to file an issue, no `/cdk:` command                            | Claude loads the skill on its own        | The skill runs; its confirm or plan approval still precedes any write            |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
