# Pre-flight

Step 1 detail. Commands run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`.

Root = `repo-root`, else cwd. Read the input (text, paths, pasted Dockerfile); app dir = the dir it points to (`dir=`), else root. Target: input `target=devcontainer` → devcontainer, else default. Devcontainer input keys (space-separated `key=value`, values with spaces in double quotes): `dir=`, `context=` (build context), `base=<image>:<tag>`, `packages=<a,b,…>`, `sudoers="<line>"`, `copy=<src>:<dest>,…`. Mode: input asks only to review, score, or audit → review (writes nothing); Dockerfile exists in the app dir → update; else create. Review mode, no Dockerfile → report it, suggest create mode, end with `Result: nothing-to-do`.
