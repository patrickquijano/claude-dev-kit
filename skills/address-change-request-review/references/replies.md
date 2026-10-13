# Review reply guide

Standard for `address-change-request-review` (GitHub and GitLab); the planner and replier read it. Replies MUST follow `## Comment quality`.

## Contents

- Labels · Comment quality · Dispositions · Reply templates · Resolve rule · Revision summary template

## Labels

Reviewer labels follow Conventional Comments: `<label> (<decoration>): <subject>`.

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
| praise     | Something done well                              | none               |

Decorations: `blocking` (must resolve before merge), `non-blocking`, `if-minor` (resolve only if the fix is small).

## Comment quality

Every reply MUST be specific (file and line, one point per reply), objective (the code, not the author), respectful, technically justified (the concrete failure, risk, or cost), focused on the expected outcome, and consistent with documented repo standards.

## Dispositions

- **Fix**: the reviewer is right, or the change is cheap and safe. Default for `issue`, `todo`, `chore`, and `blocking` threads.
- **Clarify**: the thread is ambiguous, or more than one fix is valid. Ask one specific question. Do not change code until answered.
- **Decline**: the recommendation is intentionally not adopted. Allowed only with a concrete reason: conflicts with a documented standard, out of scope for this CR, or a measurable cost. Offer an alternative or a follow-up issue.
- **Answer**: `question` threads with no code change needed. Answer directly.
- **Already done**: the requested change already exists in the branch (`already-addressed`). Point to the commit or `path:line`; change nothing.

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

Already done:

```markdown
This is already in place: <commit short SHA or `path:line`>. <One sentence on how it meets the request.>
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
