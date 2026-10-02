# Addressing open items

Used by `cdk:run-spec-kit` step 10, once per round after `speckit-converge`. Converged means converge reports converged and appends no tasks.

1. **Check fixes.** For each item on the fixed-awaiting-check list: this round's converge reports no gap for it → check off the checklist item, or drop the finding, and remove it from the list. Else leave it open.
2. **Find.** Spawn `cdk:speckit-open-items` with: feature dir, round `<n> of 5`, skip list, step 9 findings not yet fixed, converge's report (status and appended tasks), and paths to `spec.md`, `plan.md`, `tasks.md`, and `checklists/*.md`. Its `Known issue:` lines → known issues rule in Rules. It returns `Question:` → AskUserQuestion for the answer, re-spawn once with it; `Question:` again → `Result: stopped`, `Stopped: Implement, converge, address: <question>`, stop.
3. **Decide** from the agent's `Converged:` and `Open items:`.
   - No open items, converged → done.
   - No open items, not converged → next round with no questions; in round 5 → `Stopped: Implement, converge, address: not converged after 5 rounds`, stop.
   - Open items in round 5 → `Stopped: Implement, converge, address: open items after 5 rounds`, stop with no questions; no round is left to verify fixes.
   - Else step 4.
4. **Ask.** For each open item, AskUserQuestion with the agent's approaches (recommended first, with its reason) plus Skip (accept as is); ≤4 items per batch, in the agent's order: CRITICAL findings, other findings, checklist items, markers, tasks. The fix must reflect the user's intent. Skip on a CRITICAL finding → warn that it stays unresolved.
5. **Apply** each chosen fix by editing `spec.md`, `plan.md`, or code. Every fix that needs code also adds or reopens a task in `tasks.md`, since implement builds only from `tasks.md`. Add each fixed checklist item or finding to the fixed-awaiting-check list; step 1 of the next round closes it.
6. **Skip.** Add each skipped item to the skip list. Leave skipped checklist items unchecked; the skip list keeps them out of later rounds. Then start the next round.
