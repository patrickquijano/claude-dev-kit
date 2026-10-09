# Spec Kit chain

Shared by `cdk:assess-spec-kit-idea`, `cdk:fix-spec-kit-bug`, and `cdk:run-spec-kit`. `<prefix>` and `<groups>` are what the linking skill names.

- Pre-flight: `.specify/` missing → tell the user to run `/cdk:setup-spec-kit` first, stop. Any dir of `<groups>` in `required-skills.md` (this directory) missing → name the missing ones, tell the user to run `/cdk:setup-spec-kit`, stop; a partial chain fails after it has written files.
- Invoke each step with the Skill tool as `<prefix><command>`, in this main thread, never via the Agent tool: a subagent has no AskUserQuestion. One at a time, in the linking skill's order. Wait for each step to finish; speckit skills register no hooks, so steps do not chain themselves.
- Relay every question a speckit skill asks to the user with AskUserQuestion. Never invent answers; the result must reflect the user's intent and evidence. Only the exceptions the linking skill lists as pre-approved are answered without asking.
- Never edit `.specify/` templates or `.claude/skills/speckit-*/`; Spec Kit overwrites them on upgrade.
