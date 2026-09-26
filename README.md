# cdk — Claude Dev Kit

Claude Code plugin providing a development kit — skills, custom agents, and hooks — for any framework or language.

## Install

```sh
claude plugin marketplace add https://gitlab.com/patrickquijano/claude-dev-kit.git
claude plugin install cdk@claude-dev-kit
```

Local development: `claude --plugin-dir .`

## Skills

| Skill              | Purpose                                                                          |
| ------------------ | -------------------------------------------------------------------------------- |
| `/cdk:build-skill` | Interview, then create or update a skill, orchestrator + subagents, or subagent. |

## Development

```sh
npm install
npm run lint     # eslint, markdownlint-cli2, yamllint, yamlfmt, prettier
npm run format
claude plugin validate --strict .
claude plugin eval .   # eval suite in evals/
```

Requires `yamllint` and `yamlfmt` on `PATH`.
