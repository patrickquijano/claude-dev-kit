# Review reply guide

Bundled standard for `address-merge-request-review`; `address-pull-request-review` reuses `## Dispositions` and `## Reply templates`. Comment quality and labels come from `../review-merge-request/guidelines.md` (`## Labels (Conventional Comments)`, `## Comment quality`). Replies MUST be specific, objective, respectful, technically justified, focused on outcomes, and consistent with documented standards.

## Dispositions

- **Fix**: the reviewer is right, or the change is cheap and safe. Default for `issue`, `todo`, `chore`, and `blocking` threads.
- **Clarify**: the thread is ambiguous, or more than one fix is valid. Ask one specific question. Do not change code until answered.
- **Decline**: the recommendation is intentionally not adopted. Allowed only with a concrete reason: conflicts with a documented standard, out of scope for this MR, or a measurable cost. Offer an alternative or a follow-up issue.
- **Answer**: `question` threads with no code change needed. Answer directly.

Every `blocking` thread MUST get Fix, Clarify, or Decline; a blocking `question` may get Answer and stays open for the reviewer. Never ignore a thread.

## Reply templates

Fix:

```markdown
Fixed in <short SHA>. <One or two sentences: what changed and how it meets the expected outcome.>
```

Clarify:

```markdown
**question:** <Specific question that decides the fix.>

<Why it matters: the options considered and what each would change.>
```

Decline:

```markdown
I'd like to keep the current approach here. <Concrete reason, with the standard or cost it rests on.>

<Alternative offered. Link a follow-up issue only if one already exists; else offer to open one.> Happy to change it if you see a case I missed.
```

Answer:

```markdown
<Direct answer.> <Evidence: code path, doc, or test that shows it.>
```

Cite `path:line`, a commit SHA, or a repo doc when it supports the reply.

## Resolve rule

Resolve candidates are Fix threads that meet all of these:

- Label is `nitpick`, `todo`, `suggestion`, or `chore`, or the thread is unlabeled with a reviewer suggestion block.
- Label is not `issue` or `question`.
- The fix applies the request exactly as asked.
- Decoration is not assumed.
- The thread is resolvable.

Leave open for the reviewer: `issue`, `question`, Clarify, Decline, Answer, assumed-blocking, and any Fix that differs from the request. Never resolve a substantive discussion without the reviewer's agreement.

## Revision summary template

```markdown
**Review response** — @<reviewer>, …

<1–2 sentences: what changed since the last review.>

**Commits**

- <short SHA> <subject>

**Threads**

| Disposition | Count |
| ----------- | ----- |
| Fixed       | <n>   |
| Clarified   | <n>   |
| Declined    | <n>   |
| Answered    | <n>   |

**Major revisions**

- <path> — <what changed and which thread it addresses>

**Still open**

- <path:line> — <why it is open: awaiting answer, declined, needs your confirmation>

**Checks:** <commands run and result>
```

Omit empty sections except Threads.

## Sources

- <https://docs.gitlab.com/development/code_review/>
- <https://conventionalcomments.org/>
- <https://docs.gitlab.com/api/discussions/>
- <https://docs.gitlab.com/api/notes/>
- <https://gitlab.com/gitlab-org/gitlab/-/blob/master/app/graphql/mutations/merge_requests/reviewer_rereview.rb>
