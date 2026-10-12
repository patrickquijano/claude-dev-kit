# MR review guidelines

Bundled standard for `review-merge-request` and `mr-reviewer`. Sources at bottom.

## Checklist

Check each item against the diff, the MR title/description, and the repo's documented standards.

- G1 Goal: change does what the MR title/description states; nothing missing, nothing unrelated.
- G2 Correctness: logic bugs, edge cases (empty, null, boundaries, errors), concurrency, data loss.
- G3 Security: input validation at trust boundaries, authz, secrets in code, injection, unsafe defaults.
- G4 Tests: new behavior and fixed bugs have tests; tests assert outcomes, not implementation.
- G5 Docs: user-facing change updates README/docs/changelog; public API documented.
- G6 Simplicity: simplest working solution; no dead code, duplication, speculative abstraction.
- G7 Standards: follows repo docs (CLAUDE.md, CONTRIBUTING, `.claude/rules/`, lint/format/commit configs). Cite the file.
- G8 Performance: no avoidable N+1, unbounded loops or loads on hot paths.
- G9 Compatibility: breaking changes, migrations, and rollback called out.
- G10 Dependencies: MR not blocked by unresolved dependencies or unmerged prerequisites.

## Labels (Conventional Comments)

Format: `<label> (<decoration>): <subject>`.

| Label      | Use for                                          | Default decoration |
| ---------- | ------------------------------------------------ | ------------------ |
| issue      | Specific problem in the change                   | blocking           |
| todo       | Small necessary change before acceptance         | blocking           |
| chore      | Process task needed before acceptance (CI, docs) | blocking           |
| suggestion | Improvement; state why it is better              | non-blocking       |
| question   | Possible concern that needs an answer            | non-blocking       |
| nitpick    | Trivial, preference-based                        | non-blocking only  |
| thought    | Idea for later                                   | non-blocking only  |
| note       | Information for the reader                       | non-blocking only  |
| praise     | Something done well; at least one per review     | none               |

Decorations:

- `blocking`: MR must not merge until resolved.
- `non-blocking`: MR may merge without it.
- `if-minor`: resolve only if the fix is small.

Mark every non-mandatory comment `non-blocking` (GitLab guide).

## Comment quality

Every comment MUST be:

- Specific: exact file and line; one problem per comment.
- Objective: describe the code, not the author. No "you always", no sarcasm.
- Respectful: assume the author considered alternatives; ask when unsure.
- Technically justified: state the concrete failure, risk, or cost.
- Focused on outcomes: say what result is expected, not only what is wrong.
- Consistent with documented standards: cite the repo doc or guideline id (G1–G10).

## Inline comment template

```markdown
**<label> (<decoration>):** <subject>

- **Where:** `<path>:<line>`
- **Problem:** <what is wrong>
- **Why it matters:** <impact: bug, risk, cost>
- **Expected outcome:** <observable result after the fix>

<optional suggestion block>

Standard: <repo doc path or Gn>
```

Suggestion block only on added or unchanged lines. It replaces the anchored line; `-N+M` extends N lines above and M below (max 100 each):

````markdown
```suggestion:-0+0
<replacement code>
```
````

Praise uses only the first line.

## Overall comment template

```markdown
**Review summary** — @<author>

<2–4 sentences: what the MR does, overall assessment.>

| Label   | Blocking | Non-blocking |
| ------- | -------- | ------------ |
| <label> | <n>      | <n>          |

**Blocking items**

- <path:line> — <subject>

**General**

- <findings with no valid diff position, same four fields>

**Praise:** <what was done well>

**Approval checklist**

| Criterion | Result  | Reason     |
| --------- | ------- | ---------- |
| A1–A7     | ✅ / ❌ | <one line> |

**Verdict:** Changes requested | Looks good to me | Approved
```

Omit empty sections except the approval checklist.

## Approval criteria

Approve only when every criterion passes.

- A1 Requirements: change delivers everything the MR title/description state (G1).
- A2 No blocking issue: no kept `blocking` finding, in particular none on correctness (G2) or security (G3).
- A3 Tests: new and changed behavior is covered by tests that would fail without the change; bug fixes include a regression test (G4). Docs-only or config-only changes pass with a stated reason.
- A4 CI: head pipeline status is `success` and no required check or status check is pending or failed. No pipeline configured passes with a note.
- A5 Maintainability: code is readable, simple, consistent with repo standards, and free of dead code or duplication (G6, G7).
- A6 Deploy and rollback: breaking changes, migrations, config or flag changes are called out, and a rollback path exists (G9).
- A7 Approvals: every other required approval is in; the reviewer's own approval is the last one needed, or none remain.

## Review state

- Any `blocking` finding: publish with `reviewer_state=requested_changes`.
- None: publish with `reviewer_state=reviewed`.
- `reviewer_state` never records an approval. Approval is a separate API call, made only when A1–A7 pass.

## Sources

- <https://docs.gitlab.com/development/code_review/>
- <https://conventionalcomments.org/>
- <https://docs.gitlab.com/api/draft_notes/>
- <https://docs.gitlab.com/api/discussions/>
- <https://docs.gitlab.com/api/merge_request_approvals/>
- <https://docs.gitlab.com/user/project/merge_requests/reviews/suggestions/>
