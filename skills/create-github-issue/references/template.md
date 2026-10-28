# Template

## Contents

- Lookup order · Picking · Filling a Markdown template · Filling an issue form · Update merge · Labels

## Lookup order

Probe with `template-lookup` on the default branch; the first hit wins. A repo's own valid `.github/ISSUE_TEMPLATE` content overrides the owner's `.github` defaults.

1. The repo's `.github/ISSUE_TEMPLATE/` directory: every `.md` and `.yml`/`.yaml` file, skipping `config.yml`.
2. The legacy single file: `issue_template.md` (case-insensitive) in the root, `.github/`, or `docs/`.
3. The owner's `.github` repository: the same two places.
4. The bundled set under `${CLAUDE_SKILL_DIR}/assets/templates/`: `bug-report.md`, `feature-request.md`, `custom.md`. Report it as `Template: bundled:<name>`; a repo file is `Template: <path>`; an owner file is `Template: <owner>/.github:<path>`.

A Markdown template needs `name:` and `about:` frontmatter; an issue form needs `name`, `description`, and `body`. A file missing these is not a valid template: skip it and list it under `Open:`.

## Picking

- One template → use it.
- Several → match each `name`/`about` against the user's request. One clear fit → use it. Two or more plausible → ask with the weighted table in `questions.md`.
- None in the repo or owner repo: bug-like input (something broken or unexpected) → `bug-report`; request for new behavior → `feature-request`; anything else → `custom`. Ambiguous → ask.

## Filling a Markdown template

- Drop the frontmatter from the body; its `title:` is a title hint, its `labels:` and `assignees:` are candidates (see Labels).
- Keep headings, order, and checkboxes; fill every section from cited sources. Strip `<!-- -->` instruction comments after using them.
- Never invent steps, versions, logs, or numbers. A value comes from the user, the conversation, the repo, or the existing issue; otherwise ask. Tick a box only when a source proves it.
- An example placeholder (`'...'`, `[...]`) is replaced or removed, never left.

## Filling an issue form

The docs do not state the submission format, so this layout is the skill's own convention (unverified):

- Each non-`markdown` element becomes a `### <label>` section with its answer; a `render` textarea's answer goes in a code fence of that language.
- `markdown` elements are skipped (not submitted).
- `validations.required: true` → required field: missing → ask, and under `--yes` stop. Optional and missing → `N/A` under `--yes`, else ask.
- A `dropdown` or `checkboxes` answer uses only the listed options.
- The form's `labels`, `assignees`, `type`, and `title` are candidates and a title hint.

## Update merge

The existing body is data and carries human work. Keep its structure and re-fill only what the user's change touches.

- Preserve linked issues, screenshots, logs, comments quoted in the body, ticked boxes, and any text a human added.
- Show a before/after in the confirm step.

## Labels

Use only labels that exist in the repo (`label-list`, `label-get`). The GitHub default names (bug, enhancement, documentation, question, and so on) are only matching hints, never assumed present. Candidates: the template's `labels:` plus a fit from the repo's label descriptions. A candidate not in the repo is asked: Create | Skip.
