# Sub-skill stop

Step 5 detail.

- `stopped`, `cancelled`, or a failure from a chained skill → stop with no question and run no later skill; later setups may depend on it.
- List the stopped skill's `Stopped:` line and every `skipped (needs git)` skill under `Open:`, each with its recommended fix and the skill to re-run.
- `cdk:setup-git` stopped while the root is still not a git repo → `Stopped: 5: setup-git stopped; later skills need git`.
- Otherwise `Stopped: 5: <skill> <its Stopped>`.
