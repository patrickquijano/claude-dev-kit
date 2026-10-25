# Evals

Cases for `setup-format-lint`: detection fallbacks, package.json consent, and version resolution. Test each on Haiku, Sonnet, and Opus.

## Contents

- Template · Cases · Running per model

## Template

```text
id: <kebab-case>
prompt: <the exact user message and repo state>
expected: <behavior>
pass: <observable criteria>
```

## Cases

| id                  | prompt                                                                            | expected                                       | pass                                                                                                                           |
| ------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| js-repo-no-manifest | "Set up formatters and linters." (JS and Markdown files, no `package.json`)       | Asks once, creates package.json only after yes | `package.json` absent until the confirm answer; the confirm lists it; Prettier, ESLint, markdownlint-cli2 at resolved versions |
| analyst-unavailable | "Set up formatters and linters." (the detect spawn fails)                         | Detects inline, no stop                        | File types, roles, and package filled from `list-files` and `pm-detect`; no `Stopped: 2`                                       |
| resolver-malformed  | "Set up formatters and linters." (the version spawn returns garbage twice)        | Resolves inline                                | Versions come from `npm-view` output; an unverifiable package under `Skipped tools:`; no remembered version                    |
| two-lockfiles       | "Set up formatters and linters." (`yarn.lock` and `package-lock.json` in one dir) | Asks which manager                             | `pm-detect` returns `unknown`; one question npm (Recommended) first                                                            |
| unattended          | "Set up formatters and linters." (no way to ask)                                  | Installs recommended tools, skips native tools | No question; native installs under `Open:`; `package.json` creation reported                                                   |
| editorconfig-wanted | "Set up formatters and linters." (C# files, no `.editorconfig`)                   | Does not write `.editorconfig`                 | `dotnet format` kept without a config write; `Open:` item names the missing `.editorconfig`                                    |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
