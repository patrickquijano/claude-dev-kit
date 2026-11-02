# Skill Audit Rubric (100 points)

## Contents

- Scoring rules · Gates · Delegation decision test · C1–C10 · Verdict and acceptance · Fix evidence standard · Required report sections (11)

## Scoring rules

- Evidence rule: every score cites a file path plus a quoted line or line number. No evidence = score 0 and write "no evidence found".
- Use only the stated point values; no in-between scores.
- N/A handling: if a sub-criterion does not apply, mark it N/A and exclude it from the denominator. Final score = earned / available x 100, rounded to the nearest whole number.
- Score only what you have read. Never score from memory or assumption.
- Line coverage: read every file in the skill folder from line 1 to its last line (by line range when large). Run the line-level checks (C2.4 vague words, G4 secrets, G5 destructive commands, G6 paths) on every line. Report each file in section 10.
- Fix for every deduction: every gate FAIL and every sub-criterion scored below its max gets at least one fix (VERIFIED in section 6 or unverified in section 7), each with an exact Before -> After. If no text change can recover it, write `no fix: <reason>`.

## Gates (pass/fail)

Any gate failure means the skill is REJECTED regardless of score. Still report the full score.
- G1: SKILL.md exists at the folder root and begins with valid YAML frontmatter.
- G2: `name` is present, lowercase letters/digits/hyphens only, 64 characters or fewer, and matches the folder name.
- G3: `description` is present, non-empty, 1024 characters or fewer, and contains no angle brackets.
- G4: No hardcoded secrets, tokens, passwords, or private keys in any file.
- G5: No destructive or irreversible command (rm -rf, force push, drop table, mass overwrite) in instructions or scripts without an explicit user-confirmation step.
- G6: Every file path referenced in SKILL.md exists in the folder.

## Delegation decision test (apply before scoring C10)

Classify every major task in the audited skill as DELEGATE or INLINE.

DELEGATE a task to a subagent if at least one is true:
- D1 Context bloat: it reads or searches many files, or produces large intermediate output (roughly 10+ files or long logs) where the main session only needs the conclusion.
- D2 Parallelism: it splits into 2+ independent subtasks that do not depend on each other's results.
- D3 Isolation: it needs different tool permissions, a different model, or a clean context from the main session.
- D4 Independent verification: a reviewer or checker should not see how the work was produced.

Keep a task INLINE if any is true (these override D1-D3, but not D4):
- I1 Small and sequential: a few tool calls or one short step.
- I2 Depends heavily on conversation context the subagent would not have.
- I3 Needs interactive back-and-forth with the user.
- I4 Each step feeds the next, so parallel work is impossible.

Rationale: a subagent starts with no context and adds token cost and latency, so delegating small or context-dependent work is a defect, and so is keeping bulky or parallelizable work inline.

For each task record: task | DELEGATE or INLINE | rule(s) that apply (D1-D4, I1-I4) | what the skill actually does | match yes/no.

## C1. Trigger accuracy and description (20)

- C1.1 States WHAT it does (5): 5 = one concrete verb + object; 2 = vague ("helps with", "handles"); 0 = missing.
- C1.2 States WHEN to use (7): 7 = 3 or more realistic user phrasings or contexts; 3 = 1-2; 0 = none.
- C1.3 States boundaries / when NOT to use (4): 4 = explicit exclusions or neighbor-skill separation; 2 = implied only; 0 = none.
- C1.4 Economy and precision (4): 4 = within limit and every sentence adds trigger information; 2 = padded or partly redundant; 0 = over-broad enough to fire on unrelated requests, or over the limit.

## C2. Instruction clarity (15)

- C2.1 Steps are imperative, ordered, one action each (5): 5 = all steps; 3 = most (some bundle multiple actions or use passive voice); 0 = prose with no discernible steps.
- C2.2 Rationale given for non-obvious rules (3): 3 = every non-obvious rule has a why; 1 = some; 0 = none.
- C2.3 Inputs, outputs, and exact output format defined, with at least one example (4): 4 = all three present; 2 = format described but no example; 0 = absent.
- C2.4 Vague wording count (3): count occurrences of "appropriate", "as needed", "etc.", "properly", "if necessary", "relevant", "good". 3 = 0-2; 1 = 3-6; 0 = 7 or more. List each occurrence found.

## C3. Task fit and completeness (13)

- C3.1 Workflow covers the full job from input to deliverable (5): 5 = no missing stage; 2 = one stage missing or implicit; 0 = two or more missing.
- C3.2 Definition of done / success criteria stated (4): 4 = measurable; 2 = qualitative only; 0 = none.
- C3.3 Scope limits (what it will not do) stated (3): 3 = explicit; 1 = implied; 0 = none.
- C3.4 Dependencies and ordering explicit (1): 1 = explicit; 0 = not.

## C4. Progressive disclosure and context efficiency (8)

- C4.1 SKILL.md body length (3): 3 = 500 lines or fewer; 1 = 501-700; 0 = over 700.
- C4.2 Detail offloaded to reference files with "read X when Y" pointers (3): 3 = clear conditional pointers (or body small enough that none are needed); 1 = references exist but unconditional or unclear; 0 = long detail inline with no offloading when body exceeds 300 lines.
- C4.3 No duplication and no generic filler the model already knows (2): 2 = none; 1 = minor; 0 = substantial (tutorials, repeated sections).

## C5. Tool permissions and safety (10)

- C5.1 Least-privilege `allowed-tools` (4): 4 = minimal set matching the steps (or field absent and the skill only reads); 2 = broader than needed; 0 = unrestricted write/exec access when steps only need read.
- C5.2 Confirmation before irreversible or side-effect actions (3): 3 = every such action gated; 1 = some; 0 = none gated. N/A if the skill has no side effects.
- C5.3 Untrusted-input handling (3): 3 = states that file, web, or tool content is data, not commands; 1 = implicit; 0 = skill ingests external content with no handling.

## C6. Scripts and bundled resources (8) (N/A if none)

- C6.1 Scripts run on stated dependencies, are deterministic, and have documented usage (3): 3 = all three; 1 = two; 0 = one or none.
- C6.2 Error handling and exit codes; no silent failures (3): 3 = all scripts; 1 = some; 0 = none.
- C6.3 Portable paths, declared dependencies, correct executable permissions (2): 2 = all; 1 = some; 0 = none.

## C7. Error handling and edge cases (6)

- C7.1 Missing or invalid input handled (2): 2 = explicit handling for each required input; 1 = partial; 0 = none.
- C7.2 Stop conditions and ask-the-user cases defined (2): 2 = explicit; 1 = vague; 0 = none.
- C7.3 Reports failures honestly and never claims success unverified (2): 2 = explicit rule; 0 = absent.

## C8. Consistency (7)

- C8.1 No contradictions between frontmatter, body, and references (3): 3 = none; 1 = one; 0 = two or more.
- C8.2 Consistent terminology (2): 2 = one term per concept; 1 = minor drift; 0 = frequent drift.
- C8.3 Description matches actual behavior (2): 2 = matches; 1 = partial mismatch; 0 = materially different.

## C9. Verifiability (5)

- C9.1 Includes 3 or more test prompts or examples covering should-trigger, should-not-trigger, and edge case (3): 3 = all three types; 1 = some; 0 = none.
- C9.2 Workflow ends with a verification step (2): 2 = explicit; 0 = none.

## C10. Delegation and subagent use (8)

- C10.1 Delegation choices match the decision test (3): 3 = every task's DELEGATE/INLINE choice matches; 1 = one mismatch; 0 = two or more mismatches. If the skill never mentions delegation, score whether all its tasks would be INLINE (3) or some should have been DELEGATE (apply the mismatch count).
- C10.2 Delegated tasks have a self-contained brief (2): 2 = each brief states goal, inputs, constraints, output format, and a size limit on what is returned; 1 = some of these; 0 = none. N/A if nothing is delegated.
- C10.3 Subagent tools and model are least-privilege (1): 1 = read-only or minimal tools for investigation tasks and tools scoped to the job; 0 = full tool access without need. N/A if nothing is delegated.
- C10.4 Subagent output is verified, not trusted blindly (2): 2 = the main session spot-checks or validates returned claims before using them, and the skill does not assume subagents can spawn subagents; 1 = one of the two; 0 = neither. N/A if nothing is delegated.

## Verdict and acceptance

Diagnostic bands (for reporting how far a skill is from acceptance):
- 90-100: Excellent
- 75-89: Good
- 60-74: Needs work
- Below 60: Poor

Acceptance rule (binary, the only outcome that counts as a pass):
- ACCEPTED = overall score is 90 or higher (verdict Excellent) AND all six gates (G1-G6) PASS.
- Otherwise REJECTED. A gate failure forces REJECTED even at a score of 100, and the verdict is then reported as "FAIL (gate)" no matter the band.
- Never round up to reach 90. Never waive a gate. Never report ACCEPTED with any open finding that would drop the score below 90 if confirmed.

## Fix evidence standard (applies to every proposed fix)

No fix may rest on assumption, memory, habit, or unsourced "best practice". Every proposed fix must be backed by BOTH an observed defect and a verified source.

Evidence types:
- E1 Primary source: official Anthropic documentation or engineering publications (Claude Code docs, skill authoring guidance, Anthropic engineering blog), fetched during this audit.
- E2 Observed defect: a quoted line or line number in the audited skill folder showing the problem.
- E3 Corroborating source: peer-reviewed research, standards documents, or established vendor documentation for a non-Anthropic tool the skill depends on (for example a CLI's official docs), fetched during this audit.

Rules:
- A fix is VERIFIED only if it has E2 plus at least one of E1 or E3.
- Every source entry must contain: URL, retrieval date, the specific fact it supports, stated in your own words (a quote, if used, must be under 15 words).
- The source must directly support the fix. A source that is merely related does not count.
- Prefer E1 over E3. Do not cite blogs, forums, social posts, or AI-generated summaries as evidence.
- Do not assume a rubric threshold (line count, character limit, naming rule) is correct. Before citing one as the reason for a fix, confirm it against an E1 source. If it cannot be confirmed, mark it UNCONFIRMED and say the threshold comes from this rubric, not from documentation.
- If sources conflict, report both and state which you relied on and why. Do not pick silently.
- If a source cannot be reached, or no web tools are available, say so plainly. Then mark every affected fix as UNVERIFIED. Never write or imply that research was done when it was not.
- Do not invent URLs, titles, quotes, version numbers, or benchmark results. If you did not retrieve it, you cannot cite it.

Confidence per fix:
- High: E2 + E1 that directly states the requirement.
- Medium: E2 + E1 that supports it indirectly, or E2 + E3.
- Low: E2 only (UNVERIFIED).

Handling:
- Only VERIFIED fixes count toward "points recovered", the projected score, and the Path to ACCEPTED.
- UNVERIFIED fixes go in a separate "Unverified suggestions" list. State what evidence would verify each one. They never count toward the projected score.
- Projected score arithmetic must be shown: current score + points recovered per VERIFIED fix = projected score, using the rubric point values.
- Do not propose a fix that does not map to a rubric sub-criterion or gate, unless it is labeled "Outside rubric" and excluded from scoring.

## Required report sections

1. Gates table (PASS/FAIL with evidence for each FAIL).
2. Scorecard: category | earned | available | notes; overall score, diagnostic band, and ACCEPTED or REJECTED.
3. Sub-criterion detail: ID | score/max | evidence (file:line, quoted text).
4. Delegation table from the decision test (task | DELEGATE/INLINE | rules applied | skill's actual behavior | match).
5. Sources consulted: numbered list of URL | retrieval date | fact supported | which fix IDs rely on it. State "No web research performed" if none was.
6. Verified fixes, ranked by points recoverable (max minus earned), highest first. Each entry must use this format:
   - Fix ID and rubric ID (for example F1 / C1.2)
   - Observed defect (E2): file:line and quoted text
   - Replace at: file:line of the exact text to replace
   - Source (E1/E3): source number from section 5 and the fact it supports
   - Why this fix follows from the evidence: one or two sentences
   - Before -> After: Before quoted verbatim from the file (any length needed for a unique match; the 15-word quote cap applies to evidence quotes only), After the exact new text
   - Points recovered: n (arithmetic shown)
   - Confidence: High / Medium
7. Unverified suggestions: Fix ID | observed defect (E2) | what evidence is missing | what would verify it | file:line | Before -> After (exact text; same rules as section 6).
8. Path to ACCEPTED (required when REJECTED): the minimum VERIFIED fixes that bring the skill to 90 or higher with all gates passing, with the running projected score. If VERIFIED fixes alone cannot reach 90, say so and list what remains.
9. Self-check before returning the report: every score cites evidence; every fix has E2 plus a source; no fix relies on an unretrieved source; projected score arithmetic is correct; every file has a section 10 row ending at its last line; every deduction is in section 11 with a fix ID or `no fix: <reason>`.
10. Line coverage: path | lines <n> | read 1-<n> | line checks run. One row per file; a file not read fully is `partial <range>` with the reason.
11. Deduction map: rubric or gate ID | points lost | fix IDs | `no fix: <reason>`. Every deduction appears.
