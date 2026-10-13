Details step 5 (Draft). Practices: `${CLAUDE_SKILL_DIR}/references/practices.md`.

Per practices.md:

- devcontainer.json: `name` (repo dir name), `image`, `build`, or `dockerComposeFile` + `service` + `workspaceFolder`, `features`, `forwardPorts`, `mounts`, `containerEnv`, `remoteEnv`, `postCreateCommand`, `secrets`, `customizations.vscode.extensions`, plus `capAdd`, `postStartCommand`, and `waitFor` for the firewall.
- Compose: `.devcontainer/compose.yaml` (extending the repo's compose file when one exists), `.devcontainer/.env.example`, `.devcontainer/.env`, `.gitignore` entry.
- `.gitattributes` LF rule when missing; firewall → `.devcontainer/init-firewall.sh` from the reference.
- Dockerfile needed → the `cdk:write-dockerfile` arguments per practices.md `## Dockerfile handoff`.
- Update mode → keep the existing config's intent (approach, features, customizations, commands), add only what step 3 chose, fix what breaks a practice (`appPort`, Compose `ports`, `latest` tags, mounted host secrets); list each change with its reason.
