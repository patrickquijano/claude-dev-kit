# Review loop

Details step 8 (**Review loop**), up to 3 rounds. Commands run by name from `${CLAUDE_SKILL_DIR}/references/commands.md`.

1. **Review.** Invoke `cdk:review-change-request <n> --yes --squash <yes|no> --delete-branch <yes|no>`. It posts one review with labeled inline comments and merges a clean PR or MR; read `Merged:` from its Output.
2. **Merged** → step 9.
3. **Pending required checks** → GitHub `checks-watch` (30-minute cap), GitLab re-read `head_pipeline` until it finishes (30-minute cap), at most 2 waits, then repeat 8.1 once; still pending → blocker `checks pending`, leave the loop. A wait does not use a round.
4. **Blockers or open items** (a `(blocking)` comment, failing checks, or other open findings) → invoke `cdk:address-change-request-review <n> --self-review --yes`. Then run step 5 again and start the next round at 8.1. A round = one review plus its fix cycle, so the third round ends with a final review and no fix. An item that needs a person (required approval from someone else, conflicts, draft, branch policy) → record it as a blocker and leave the loop.
5. After the third review with items left → blocker `review rounds`, leave the loop. GitHub reads "approved" as: no `(blocking)` comment and required checks passing (own PR), else `reviewDecision` `APPROVED`.
