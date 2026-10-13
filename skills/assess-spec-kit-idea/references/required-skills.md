# Required skills

Spec Kit skills this skill invokes; each must exist as `.claude/skills/<name>/` in the project.

- Core (from `specify init`, needed by `cdk:run-spec-kit` on a go handoff): `speckit-constitution`, `speckit-specify`, `speckit-clarify`, `speckit-plan`, `speckit-checklist`, `speckit-tasks`, `speckit-analyze`, `speckit-implement`, `speckit-converge`.
- `assess` extension: `speckit-assess-intake`, `speckit-assess-research`, `speckit-assess-define`, `speckit-assess-shape`, `speckit-assess-decide`.

Missing `.specify/` or any dir above: name what is missing, tell the user to run `/cdk:setup-spec-kit`, stop. A partial chain fails after it has written files.
