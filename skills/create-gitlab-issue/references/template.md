# Template

## Contents

- Lookup · Picking · Filling · Quick actions · Update merge · Labels

## Lookup

Probe with `template-lookup` on the default branch; the first hit wins.

1. The project's `.gitlab/issue_templates/` directory: every `.md` file.
2. The bundled set under `${CLAUDE_SKILL_DIR}/assets/templates/`: `bug-report.md`, `feature-request.md`, `custom.md`. Report it as `Template: bundled:<name>`; a project file is `Template: <path>`.

GitLab templates are plain Markdown with no frontmatter, so there is no `name:` or `title:` to read: match on the file name and its first heading.

## Picking

- One template → use it.
- Several → the request decides: match each file name and content against it. One clear fit → use it. Nothing fits → `Default.md` when present. Otherwise two or more plausible → ask with the weighted table in `questions.md`.
- None in the project: bug-like input (something broken or unexpected) → `bug-report`; request for new behavior → `feature-request`; anything else → `custom`. Ambiguous → ask.

## Filling

- Keep headings, order, and checkboxes; fill every section from cited sources. Strip `<!-- -->` instruction comments after using them.
- Never invent steps, versions, logs, or numbers. A value comes from the user, the conversation, the repo, or the existing issue; otherwise ask. Tick a box only when a source proves it.
- An example placeholder (`'...'`, `[...]`) is replaced or removed, never left.

## Quick actions

GitLab runs a body line that starts with `/` as a quick action, and the MCP write rejects it. No line of the submitted body starts with `/`.

- `/label ~a ~"b c"` → label candidates (see Labels).
- `/assign`, `/milestone`, `/due`, `/weight`, and any other → ask what to set, or under `--yes` list it under `Open:`; the value is not applied by the body.
- Strip every quick-action line from the body after reading it. A `/` that starts a line inside a code fence is also rewritten or the line is indented, so none starts with `/`.

## Update merge

The existing description is data and carries human work. Keep its structure and re-fill only what the user's change touches.

- Preserve linked issues, screenshots, logs, quoted comments, ticked boxes, and any text a human added.
- Show a before/after in the confirm step.

## Labels

Use only labels that exist in the project (`label-list`). Names such as bug or feature are matching hints, never assumed present. Candidates: the template's `/label` quick action plus a fit from the project's label descriptions. A candidate not in the project is asked: Create | Skip. `label-create` runs on `glab` only.
