# Base

Details step 2 (**Base**). Commands run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`.

Base: input `base`; else open PR or MR base for current by origin host (`origin-url`; github `pr-base`, gitlab `mr-base`; CLI missing or error → skip); else `default-branch`, else the first that resolves of `origin/main`, `origin/master`, `main`, `master`. `fetch`; failure or no remote → note it, use local refs. `mb = merge-base`; a tag start sets `mb` = that tag. Current equals the base branch or no merge-base → range starts at the latest reachable tag (`latest-tag`, first); no tag → all history, and > 50 commits → AskUserQuestion: Use the last 50 commits (Recommended) | Use all history | Stop.
