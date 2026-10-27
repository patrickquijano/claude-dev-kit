# Generic

Use when the stack is not one of node, python, go, java, php, ruby, dotnet, rust, or docker.

## Research

1. Find the manifest and lockfile; the lockfile names the cache key.
2. Find the official build and test commands in the repo's README, Makefile, or manifest scripts.
3. Search the web for the official Docker image family and its variants; note which variant is smallest and still runs the toolchain.
4. Find where the toolchain stores its dependency cache and set that path under the project dir.
5. Find the test runner's JUnit and Cobertura output options.

## Output

- Cache: `files: [<lockfile>]` key; `policy: pull` on read-only jobs.
- Test, coverage, and report artifacts with `expire_in`.
- Image: resolve at workflow step 4; no match → ask.
- Anything not found goes under `Unverified:`.
