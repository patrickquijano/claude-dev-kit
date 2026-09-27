---
name: assess-spec-kit-idea
description: Assess an idea with the GitHub Spec Kit assess extension before building it. Extract the idea from the input, then chain speckit-assess-intake, research, define, shape, and decide under one slug. A go verdict hands the decision.md handoff summary to run-spec-kit; needs-clarification re-runs the named stage after the user answers; kill stops. Use when the user asks to assess, evaluate, or vet an idea with Spec Kit.
argument-hint: '<idea text | URL | ticket | codebase pointer>'
---

# Assess Spec Kit Idea

Input: $ARGUMENTS

## Rules

- Invoke each step with the Skill tool as `speckit-assess-<command>`, one at a time, in order. Wait for each step to finish; the assess extension registers no hooks, so steps do not chain themselves.
- Pass `slug=<slug>` to every step after intake. All five commands share the slug and write only to `.specify/assessments/<slug>/`.
- Relay every question a speckit skill asks to the user with AskUserQuestion. Never invent answers; the verdict must reflect the user's evidence. Exception, pre-approved by this workflow: during step 7 re-runs only, answer yes to overwriting artifacts in the current slug; on the first pass relay overwrite prompts, since the slug may hold an earlier assessment.
- Never edit `.specify/` templates or `.claude/skills/speckit-*/`; Spec Kit overwrites them on upgrade.
- Issue → check `## Known issues` first. Fix for a recurring or workflow-blocking issue → append `- <symptom> → <fix>` to source SKILL.md (repo path, not plugin cache); not writable → print line for user.

## Workflow

1. **Preflight.** `.specify/` missing → tell the user to run `/cdk:setup-spec-kit` first, stop. Any of `.claude/skills/speckit-assess-{intake,research,define,shape,decide}/` missing → name the missing ones, tell the user to run `/cdk:setup-spec-kit`, stop. Input empty → AskUserQuestion for the idea.
2. **Extract** the idea: what it is, who asked, and any URLs, tickets, or codebase paths. Keep URLs verbatim; intake fetches them under its own trust policy. No idea found → AskUserQuestion for one. Show the idea in one or two lines.
3. **Intake.** Run `speckit-assess-intake <idea>`. Intake asks for a slug and suggests one; relay it. Take the slug from its `Slug:` line.
4. **Research, define, shape.** Run `speckit-assess-research slug=<slug>`, then `speckit-assess-define slug=<slug>`, then `speckit-assess-shape slug=<slug>`.
5. **Decide.** Run `speckit-assess-decide slug=<slug>`. Read the `**Verdict**` line in `.specify/assessments/<slug>/decision.md`:
   - `go` → step 6.
   - `needs-clarification` → step 7.
   - `kill` → show the decisive reason from `## Verdict & Rationale`, report the output below, stop.
6. **Hand off.** Report the output below first; run-spec-kit output would bury it. Read the section whose heading starts with `## If go`, up to the next `##` heading. Invoke the `cdk:run-spec-kit` skill with that section body verbatim as its argument; run-spec-kit owns the rest, including its own review gate before implementation.
7. **Clarify.** 2 re-runs done → list the blocking questions, report, stop; repeated blocks point to missing evidence only the user can gather. Else show the `**Blocking questions**` and `**Revisit stage**` from `decision.md`. AskUserQuestion: Answer and re-run (Recommended) | Stop. Answer → collect answers to each blocking question, run `speckit-assess-<revisit stage> slug=<slug> <answers>` (intake also gets the idea from step 2), run every later stage through decide with `slug=<slug>`, then read the verdict again as in step 5. Stop → report, end.

## Output

```text
Assessment: .specify/assessments/<slug>/
Verdict: go | needs-clarification | kill (<re-runs> re-run(s))
Next: run-spec-kit started | blocking questions open | closed (<decisive reason>)
```

## Known issues

- none
