# Extensions

Step 3 detail. Commands run by name from `commands.md`.

- Fail on `extension-add` or `extension-set-priority` → quote the error line, continue with the next extension, no retry.
- Then re-run `plan-extensions` and read `skills.missing` (keys `core`, `assess`, `bug`). Extension listed but any of its dirs missing → run `extension-reinstall` (keeps its config), re-check its dirs; still missing or fail → quote the error line, add to `Open:`.
- Record any other missing dirs in `Open:`.
- `plan-extensions` returns `ok: false` → quote its `error`, add it to `Open:`, skip step 3's adds and step 4's `.gitignore` edit, go to step 5; the Output shows `Git ignore: skipped (plan failed)` and `Required skills: skipped (plan failed)`.
