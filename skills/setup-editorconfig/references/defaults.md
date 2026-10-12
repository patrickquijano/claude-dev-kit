# EditorConfig Defaults

## Base `[*]`

```ini
[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 2
insert_final_newline = true
trim_trailing_whitespace = true
```

## Types

Properties a type section writes. A type whose properties equal the actual `[*]` gets no section. With `indent_style = tab`, `tab_width` defaults to `indent_size`, so `indent_size = 4` shows tabs 4 columns wide.

| Type            | Patterns                                                                                                                                                                     | Properties                                | Reason                                                        |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------- |
| PHP             | `*.php`                                                                                                                                                                      | `indent_style = space`, `indent_size = 4` | PSR-12 requires 4 spaces                                      |
| .NET            | `*.cs`, `*.csx`, `*.vb`, `*.fs`, `*.fsx`, `*.fsi`, `*.cshtml`, `*.razor`                                                                                                     | `indent_style = space`, `indent_size = 4` | .NET convention and Visual Studio default                     |
| Python          | `*.py`, `*.pyi`                                                                                                                                                              | `indent_style = space`, `indent_size = 4` | PEP 8 requires 4 spaces                                       |
| Java and Kotlin | `*.java`, `*.kt`, `*.kts`                                                                                                                                                    | `indent_style = space`, `indent_size = 4` | Google Java and Kotlin style guides use 4 spaces              |
| Rust            | `*.rs`                                                                                                                                                                       | `indent_style = space`, `indent_size = 4` | rustfmt default                                               |
| Shell           | `*.sh`, `*.bash`, `*.zsh`, `*.ksh`                                                                                                                                           | `indent_style = tab`, `indent_size = 4`   | tabs shown 4 columns wide; shfmt indents with tabs by default |
| PowerShell      | `*.ps1`, `*.psm1`, `*.psd1`                                                                                                                                                  | `indent_style = space`, `indent_size = 4` | PSScriptAnalyzer indentation rule defaults to 4 spaces        |
| Makefile        | `Makefile`, `makefile`, `GNUmakefile`, `*.mk`                                                                                                                                | `indent_style = tab`, `indent_size = 4`   | make requires recipe lines to start with a tab                |
| Go              | `*.go`                                                                                                                                                                       | `indent_style = tab`, `indent_size = 4`   | gofmt indents with tabs                                       |
| Batch           | `*.bat`, `*.cmd`                                                                                                                                                             | `end_of_line = crlf`                      | `cmd.exe` mis-parses labels and `goto` in LF-only files       |
| Markdown        | `*.md`, `*.markdown`                                                                                                                                                         | `trim_trailing_whitespace = false`        | two trailing spaces are a hard line break                     |
| Diff and patch  | `*.diff`, `*.patch`                                                                                                                                                          | `trim_trailing_whitespace = false`        | trailing whitespace is content                                |
| YAML            | `*.yml`, `*.yaml`                                                                                                                                                            | `indent_style = space`, `indent_size = 2` | YAML forbids tab indentation                                  |
| Web and data    | `*.js`, `*.jsx`, `*.ts`, `*.tsx`, `*.mjs`, `*.cjs`, `*.json`, `*.jsonc`, `*.css`, `*.scss`, `*.html`, `*.vue`, `*.xml`, `*.csproj`, `*.props`, `*.targets`, `*.rb`, `*.toml` | `indent_style = space`, `indent_size = 2` | 2 spaces is their common convention                           |
