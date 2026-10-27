# gh api fallback

Use only when `gh` lacks a needed flag or subcommand (`help-create`, `help-edit`); every other operation stays on the named commands. Parameters are verified at runtime: run `gh api --help` and the GitHub REST releases docs before the first call, and drop any field the API rejects. Each write is covered by the plan approval; none is pre-approved.

Bodies go through a scratch file: `-F body=@<scratch>/notes.md` (the `@` form reads the file), never an inline string. `<id>` is the numeric release ID from a GET.

| Operation  | Command                                                                                                                                                                               | Notes                                                                 |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Get by tag | `gh api repos/<owner>/<repo>/releases/tags/<tag>`                                                                                                                                     | 404 → no published release; check drafts in the list below            |
| Get by ID  | `gh api repos/<owner>/<repo>/releases/<id>`                                                                                                                                           | A numeric Input is an ID                                              |
| List       | `gh api repos/<owner>/<repo>/releases?per_page=30`                                                                                                                                    | Drafts appear here; a draft has no tag-based GET                      |
| Create     | `gh api -X POST repos/<owner>/<repo>/releases -f tag_name='<tag>' -f name='<tag>' -F body=@<scratch>/notes.md -F draft=<bool> -F prerelease=<bool> [-f target_commitish='<default>']` | Omit `target_commitish` when the tag exists; never send `make_latest` |
| Update     | `gh api -X PATCH repos/<owner>/<repo>/releases/<id> -f name='<tag>' -F body=@<scratch>/merged.md -F draft=<bool> -F prerelease=<bool>`                                                | Send only the fields that change                                      |
| Changelog  | `gh api repos/<owner>/<repo>/contents/CHANGELOG.md?ref=<ref>`                                                                                                                         | `content` is base64                                                   |

Set `Tool: gh api` in the Output when any row above ran. An immutable release rejects a PATCH to its tag or assets; report the error line and follow the immutable retry in step 10.
