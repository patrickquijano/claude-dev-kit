Details step 13 (Confirm).

`--yes` → take the recommended effect without asking. Else one AskUserQuestion with options naming each effect: push required → `Push + Create CR` (Recommended) | Revise | Cancel; push none → `Create CR` (Recommended) | Revise | Cancel; update path → `Update CR` (keep title, recommended unless the title fails the rules) | `Update CR + title`, each prefixed `Push +` when a push is needed, plus Revise and Cancel. Revise → back to the step the user names (cap in Rules). Cancel → `Result: cancelled`, nothing written. Name the CR `PR` or `MR` by host in the labels.
