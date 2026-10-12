# Write

Details step 6 of `${CLAUDE_SKILL_DIR}/SKILL.md`.

Append one section per step 5 group, preceded by a blank line and a `# <Types>` comment. Write every property from `defaults.md` for the group, including `indent_style` and `indent_size`, so the section does not depend on `[*]`. Glob: use each type's full catalog patterns; one pattern → as is (`[*.php]`); several → one top-level brace list (`[{*.sh,*.bash,Makefile,*.mk}]`), because braces around one item are literal and nested braces mixing names and extensions are hard to read. Keep the file LF-terminated.
