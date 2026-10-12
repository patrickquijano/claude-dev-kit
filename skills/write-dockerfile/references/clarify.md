# Clarify

Step 3 detail.

Devcontainer target → skip this step entirely. Each fact still missing or ambiguous → AskUserQuestion (max 4 per call), recommended option first with the reason: exact runtime version, build and start commands, port. Derivable → don't ask. Apply these Recommended defaults without asking, unless the input or an existing Dockerfile already answers, and list them in the Output: copy only the needed application files into the image (self-contained image); create a non-root user and group with `APP_USER=app`, `APP_UID=10001`, `APP_GID=10001` (limits damage if the app is compromised; above the range distros assign to system and login accounts); Debian slim base unless its official runtime image lacks one (then Ubuntu, then Alpine; glibc, broad package support); purpose production unless the input says dev or devcontainer.
