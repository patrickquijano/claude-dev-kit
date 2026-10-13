# Preview

Step 9 detail (the AskUserQuestion choices).

- Else AskUserQuestion, none marked recommended: `Post review (<STATE>)` | `Post as plain review` | `Don't post`; omit the middle option when the state is already plain. When approval is offered, add in the same call: Approve (`Approve` | `Don't approve`). When merge is offered, add Merge (`Merge #<n> now` | `Don't merge`; never recommended; an _admin_ merge is labeled `Merge #<n> now (--admin, bypasses required review)`). A call holds at most 4 questions, so when Merge is picked, ask Squash (`Squash into one commit` | `Keep commits (merge commit)`) and Delete the source branch (`Delete source branch` | `Keep branch`; recommended per the host `## Merge`) in a second call, skipping any question a flag already answered. Merge applies only with an approval or when Self already approved, per the host `## Merge`.
