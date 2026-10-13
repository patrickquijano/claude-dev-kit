# Check

Details step 7 of `${CLAUDE_SKILL_DIR}/SKILL.md`; commands by name in `${CLAUDE_SKILL_DIR}/references/commands.md`.

Checker = `checker` when `tool-check` finds it; else `checker-ec` only when `ec-version` exits 0 and prints just a version number (the editorconfig-checker binary; another tool named `ec` fails this). Found → run it once from the git root (no writes) and count problems. Else skip. Never auto-fix; existing files keep their style until re-saved or formatted.
