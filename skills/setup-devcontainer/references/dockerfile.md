Details step 8 (Dockerfile).

Dockerfile needed → invoke `cdk:write-dockerfile` via the Skill tool with the step 5 arguments. Read its Output: `Result: done` or `nothing-to-do` → keep its `App:`, `Stages:` (the Base digest), `Files:`, and `Checks:` lines, and confirm `<App dir>/Dockerfile` matches `build.dockerfile` (or the Compose `app` `build`), fixing the reference when it differs; else stop per orchestration.md: run step 10 on what is left (keep the chained write-dockerfile `Resolution:` lines), then print `Stopped: 8: write-dockerfile <its Stopped>`.
