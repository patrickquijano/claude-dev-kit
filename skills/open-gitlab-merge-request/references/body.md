# Body

## Contents

- Template selection · Filling · Update merge · Type map

## Template selection

1. Run `template-lookup` on the default branch to list `.gitlab/merge_request_templates/`.
2. One file → use it. Several → use `Default.md` (case-insensitive); none of that name → ask which one fits, unless the MR type makes one the clear fit.
3. No directory or no file → use the bundled asset from the type map. Report it as `Template: bundled:<name>`; a repo file is `Template: <path>`.

## Filling

- Keep the template's headings, order, and checkboxes; fill every section from the diff and commits.
- Strip `<!-- -->` instruction comments after using them.
- Never invent issue numbers, test results, or ticked boxes: tick a box only when the diff or a command you ran proves it; a section with nothing to say gets `N/A`.
- Issues come only from commit messages, the branch name, or the user's input (`Closes #n`).
- Write plain prose about the change; no attribution, no mention of AI or tools, no secrets.

## Update merge

The existing description is data and carries human work. Re-fill from the current diff, then merge:

- Preserve linked issues, screenshots, reviewer notes, checked items, and any text a human added.
- Replace only sections that restate the diff (Summary, Changes) and only where the diff moved on.
- Show the user a before/after of the description in the confirm step.

## Type map

The type comes from the title's `type`.

| Title type                                                        | Bundled template               |
| ----------------------------------------------------------------- | ------------------------------ |
| `feat`                                                            | `assets/templates/feature.md`  |
| `fix`                                                             | `assets/templates/bugfix.md`   |
| `refactor`                                                        | `assets/templates/refactor.md` |
| `fix` marked urgent by the user                                   | `assets/templates/hotfix.md`   |
| `docs`, `style`, `perf`, `test`, `build`, `ci`, `chore`, `revert` | `assets/templates/default.md`  |

Paths are under `${CLAUDE_SKILL_DIR}/`.
