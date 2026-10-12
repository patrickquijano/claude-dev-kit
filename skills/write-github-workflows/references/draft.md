# Draft

Step 6 detail.

Per `layout.md` and `practices.md`: the orchestrator and one callee per job; `runs-on` the resolved label; every `uses:` and `image:` from the table in the resolver's pinning mode (SHA mode keeps `# vX.Y.Z` comments); explicit `permissions` per job; `timeout-minutes`; step-level `env`; cache and artifacts with `retention-days`; `if: ${{ always() }}` cleanup for each credential, temp file, login, or container the job creates. A touched job with a required check (analyzer `Required checks`) → add the `_gate.yml` callee per `layout.md` as the single stable check, and build the `Check-name map`. Fill `Policy applied` with each **cdk**-marked practice used and `Retained constraints` with each check rename and skipped signal. Update mode → edit in place, list each change with its reason.
