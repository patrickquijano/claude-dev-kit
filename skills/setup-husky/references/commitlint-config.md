# Commitlint config

Step 10 detail.

Any `commitlint.config.*`, `.commitlintrc`, `.commitlintrc.*`, or `commitlint` key in `package.json` in package dir → keep it; the hook uses it, then enforce header ≤72 in it. JSON or YAML config (or `package.json` key) with no `header-max-length` rule → append `"header-max-length": [2, "always", 72]` under `rules`, keeping everything else. Rule with a different value → AskUserQuestion: Set 72 (Recommended; matches the commit rules) | Keep. JS or TS config → report only; the hook's own header check still holds the limit. No config → copy `${CLAUDE_SKILL_DIR}/assets/.commitlintrc.json`: Conventional Commits, header ≤72, subject only, no `Co-authored-by`. The hook adds its own header-length and imperative-mood checks on top, so 72 holds even without the config rule.
