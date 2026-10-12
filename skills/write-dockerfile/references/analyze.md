# Analyze

Step 2 detail.

Collect: language and runtime version (`.nvmrc`, `engines`, `.python-version`, `go` directive, `rust-toolchain`, `global.json`, …), package manager + lockfile, build command and output dir, start command, port, env vars, system packages, health endpoint, monorepo layout. Existing `Dockerfile`, `.dockerignore`, `compose*.yaml`, CI build steps → read them. Build context = `context=`, else the dir the build needs files from (monorepo app using shared packages → repo root); `.dockerignore` goes at the context root. Devcontainer target → collect only the existing Dockerfile and the context's files; the input gives the rest. Review mode → step 7, then steps 8 and 9.
