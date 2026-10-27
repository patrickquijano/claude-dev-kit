# Portable Markdown

Syntax every host renders, and how to convert what is not.

## Allowed

- CommonMark, plus tables, task lists, and fenced code with a language tag.
- Relative links only for files in the repo.
- Heading anchors in the lowercase-hyphen slug form. Hosts can differ; an anchor that cannot be verified is reported under `Open:`, never guessed per host.

## Banned

| Syntax found                             | Action                                          |
| ---------------------------------------- | ----------------------------------------------- |
| Alert (`> [!NOTE]`, `> [!WARNING]`, ...) | Convert to `> **Note:**` (or the alert's label) |
| `[[_TOC_]]`, `[TOC]`                     | Convert to a plain link list                    |
| Front matter (`---` block)               | Keep; list under `Open:`                        |
| Diagram block (mermaid, plantuml, ...)   | Keep; list under `Open:`                        |

No content is deleted. List each conversion in the Confirm and in `Converted:`.

## Table of contents

A plain list of links to each H2, placed after the intro, only when the file is 100 lines or more.

## Badges

- Add a badge only for CI config found in the repo, with a URL derivable from the detected host and that CI file.
- Generic host → no new badge.
- Existing badges are preserved.
