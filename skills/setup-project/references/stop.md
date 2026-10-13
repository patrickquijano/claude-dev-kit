# Sub-skill stop

Details step 5 of `${CLAUDE_SKILL_DIR}/SKILL.md`.

`stopped`, `cancelled`, or a failure → stop, no ask (a chained `cancelled` with no open item left by earlier skills prints `Resolution: not run (cancelled)`); later setups may depend on it. Run step 6 on what the chained skills left (including the stopped skill's `Stopped:` line and the `skipped (needs git)` skills), without re-running any skill, then print the Output with `Stopped: 5: <skill> <its Stopped>`; `cdk:setup-git` while the root is still not a git repo → `Stopped: 5: setup-git stopped; later skills need git`.
