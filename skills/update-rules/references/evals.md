# Evals

Cases for `update-rules`: create, score-only, conflicts, and the subagent fallbacks. Test each on Haiku, Sonnet, and Opus.

## Contents

- Template · Cases · Running per model

## Template

```text
id: <kebab-case>
prompt: <the exact user message and repo state>
expected: <behavior>
pass: <observable criteria>
```

## Cases

| id                    | prompt                                                                                                                             | expected                                                                                  | pass                                                                                                                                                        |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| create-set            | "Write CLAUDE.md for this repo." (none exists)                                                                                     | Fills the template, writes, scores                                                        | Only `CLAUDE.md` and `.claude/rules/**` written, with no approval wait; always-loaded lines under 200                                                       |
| score-only            | "Score my CLAUDE.md."                                                                                                              | Scores without writing                                                                    | No file changed; deductions listed                                                                                                                          |
| conflict-ask          | "Update the rules." (two files disagree)                                                                                           | Asks, never resolves silently                                                             | One question per conflict with keep A, keep B, merge; unattended keeps the existing side                                                                    |
| known-issues-move     | "Update the rules." (a `Known issues` section exists)                                                                              | Moves it to auto memory                                                                   | `feedback` memory plus `MEMORY.md` pointer listed in `Files:`; section removed                                                                              |
| subagents-unavailable | "Update the rules." (no subagent can be spawned)                                                                                   | Gathers facts, scores, and improves inline                                                | Same Output block; no stop                                                                                                                                  |
| below-pass            | "Improve my rules." (score under 95)                                                                                               | Improves in rounds                                                                        | At most 3 improve rounds; leftovers under `Open:`                                                                                                           |
| rescore-always        | "Improve my rules." (improver returns `Expected: 80→98/100`)                                                                       | Rescores after every improve round                                                        | `Score:` comes from the round's fresh rescore, never `Expected:`; the last round at the cap is rescored                                                     |
| keep-tracked          | "Update the rules." (a tracked file has only duplicate content)                                                                    | Leaves the file, reports it                                                               | No `git rm` or file removal; the file is listed under `Open:` with the reason; no Delete \| Keep question                                                   |
| auto-invoke           | A natural request for the action, no `/cdk:` command                                                                               | Claude loads the skill on its own                                                         | The skill runs and carries out its steps with no approval step                                                                                              |
| repeat-candidates     | "Update rules." (the same test-before-commit instruction in the input, `CLAUDE.md`, and a memory file; a second instruction twice) | Offers a skill for the 3x one and a rule for the 2x one                                   | One ask per candidate: Add rule \| Build a skill \| Omit; the 2x one has no skill option; an accepted skill is a plain-words `Next:` line, nothing is built |
| repeat-unattended     | "Update rules --yes." (same repeats)                                                                                               | Asks nothing, writes nothing for them                                                     | Each candidate is under `Open:` with its count; no `Next:` skill line                                                                                       |
| grill-close-call      | A decision question whose top two totals are ≤5 apart                                                                              | Table before the question; no Recommended                                                 | Table before the question; integer weights sum to 100; no Recommended; "close call" stated; unverified scores marked                                        |
| no-approval-step      | "Write CLAUDE.md for this repo." (none exists)                                                                                     | Runs end to end with no approval step and no confirmation; side-effect steps run directly | No approval wait; each side-effect step runs directly after the decision questions                                                                          |
| update-adds-scope     | "Update the rules." (`CLAUDE.md` has only the scope and one-commit Changes lines; the principles rule has no Workflow line)        | Adds the missing change-scope and Workflow lines in place                                 | The Changes line and a Workflow line are added; no Z3 or S1 loss; principles rule at most 30 non-blank lines; always-loaded lines under 200                 |

## Running per model

Run every case on Haiku, Sonnet, and Opus; a case passes only when every pass criterion is observed. Record any model that fails and fix the skill text, not the case.
