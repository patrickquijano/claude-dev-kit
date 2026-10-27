# Naming

- Existing action names, input IDs, and output IDs never change; renaming or removing one is breaking.
- Action directory: lowercase kebab-case, noun or verb-noun (`setup-node-cache`, `deploy-preview`); the file is always `action.yml`.
- `name:` Title Case, unique, no "GitHub" prefix; `description:` one sentence; `author:` the repo owner.
- Inputs and outputs: lowercase kebab-case, one meaning each (`working-directory`, `cache-hit`).
- Test workflow: `test-<action-name>.yml`, workflow `name:` `Test <Action Name>`.
- Release tags: `vX.Y.Z` plus a moving major tag `vX`.
