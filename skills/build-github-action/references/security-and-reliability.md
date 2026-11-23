# Security and reliability

- Pin every remote `uses:` inside the action to a full commit SHA with a trailing `# vX.Y.Z` comment; the test workflow pins the same way.
- Pass inputs to scripts through `env:`; never `${{ inputs.* }}` inside `run:`. Quote shell variables.
- Every composite `run:` step sets `shell:` (default `bash`; `sh` only when the script is POSIX).
- Secrets arrive as inputs from the caller; never read them from the environment implicitly, never echo them. Mask derived secrets with `::add-mask::`.
- State the minimal `permissions` the action needs in the README; the test workflow sets top-level `permissions: contents: read` plus only that.
- Docker: pin the base image by exact tag and digest (the image runs in other repos' workflows, and a digest pins a specific image version even if the tag is re-pushed, <https://docs.docker.com/build/building/best-practices/#pin-base-image-versions>), no `USER` instruction (GitHub runs Docker actions as root), no secrets in image layers.
- JavaScript: commit the bundled `dist/`; never `node_modules`; fail with `core.setFailed`, never an uncaught throw.
- Fail early and loudly: validate required inputs at the top and exit non-zero with a clear message.
- Test workflow: `timeout-minutes` on every job, `concurrency` with `cancel-in-progress: true`, `persist-credentials: false` on checkout.
