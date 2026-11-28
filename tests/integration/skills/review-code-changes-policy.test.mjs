import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const walk = (dir) =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
const mdFiles = (skill) => walk(join(root, 'skills', skill)).filter((p) => p.endsWith('.md'));
const skillMd = (skill) => readFileSync(join(root, 'skills', skill, 'SKILL.md'), 'utf8');

describe('review-code-changes policy', () => {
  test('keeps no fix memory', () => {
    // Arrange
    const files = mdFiles('review-code-changes').map((p) => readFileSync(p, 'utf8'));
    // Act
    const hits = files.filter((t) => /fix memory|cdk-fix-review|memory fix/i.test(t));
    // Assert
    assert.deepEqual(hits, []);
  });

  test('runs no formatter or linter', () => {
    // Arrange
    const forbidden = /prettier|eslint|markdownlint|--fix/i;
    // Act
    const hits = mdFiles('review-code-changes').filter((p) => forbidden.test(readFileSync(p, 'utf8')));
    const rule = /^- Runs no formatter or linter/m.test(skillMd('review-code-changes'));
    // Assert
    assert.deepEqual(hits, []);
    assert.ok(rule, 'no-formatter rule missing');
  });

  test('leaves nit and question findings unaddressed', () => {
    // Arrange
    const text = skillMd('review-code-changes');
    // Act
    const rule =
      /^- `nit` and `question` findings are unaddressed: never fixed or counted open, listed under `Unaddressed:`; definition in `\$\{CLAUDE_SKILL_DIR\}\/references\/review\.md` Validation\./m.test(
        text
      );
    const review = readFileSync(join(root, 'skills', 'review-code-changes', 'references', 'review.md'), 'utf8');
    const definition = /^- Unaddressed: every `nit` and `question`.*`Unaddressed:` in the Output/m.test(review);
    // Assert
    assert.ok(rule, 'unaddressed pointer missing');
    assert.ok(definition, 'unaddressed definition missing in review.md');
  });

  test('caps Phase 1 at 3 rounds with no extension ask', () => {
    // Arrange
    const text = skillMd('review-code-changes');
    // Act
    const cap =
      /^- Caps: Phase 1 runs at most 3 rounds of fix → re-review, with no extension and no extra loop; Phase 2 runs once/m.test(
        text
      );
    const all = mdFiles('review-code-changes').map((p) => readFileSync(p, 'utf8'));
    const stale = all.some((t) => /Extend 3 more rounds/.test(t));
    // Assert
    assert.ok(cap, 'Phase 1 cap rule missing');
    assert.equal(stale, false);
  });

  test('stops and escalates when cdk:implement-spec reports a verification failure', () => {
    // Arrange
    const skill = skillMd('review-code-changes');
    const fix = readFileSync(join(root, 'skills', 'review-code-changes', 'references', 'fix.md'), 'utf8');
    // Act
    const skillRule =
      /^- Fixes go through .*is in `\$\{CLAUDE_SKILL_DIR\}\/references\/fix\.md` `## Implement`\.$/m.test(skill);
    const failure =
      /`Verify:` is `fail` or `not run`; `Goals:` has unmet above 0; `Result:` is `stopped` or `cancelled`\. Then STOP and escalate/.test(
        fix
      );
    const noRetry = /Never re-invoke it to retry and never run a check of your own\./.test(fix);
    const skipped = /`Verify: skipped \(<reason>\)` with every goal met and `Result: done` counts as passed/.test(fix);
    const stale = /any other `Stopped:` is a cap stop/.test(skill + fix);
    // Assert
    assert.ok(skillRule, 'SKILL.md pointer to the fix.md mapping missing');
    assert.ok(failure, 'fix.md verification-failure rule missing');
    assert.ok(noRetry, 'no-retry rule missing');
    assert.ok(skipped, 'skipped-verification rule missing');
    assert.equal(stale, false);
  });

  test('reverts Phase 2 fixes from the snapshot and never deletes new files', () => {
    // Arrange
    const fix = readFileSync(join(root, 'skills', 'review-code-changes', 'references', 'fix.md'), 'utf8');
    // Act
    const revert =
      /^- Verification failed or could not be completed \(same conditions\) → restore: .*`<scratch>\/snap\/<path>`/m.test(
        fix
      );
    const newFile = /A path in `absent` that now exists is a new file: leave it and list it under `Open:`\./.test(fix);
    const noReviewer = /Do not spawn the reviewer\./.test(fix);
    // Assert
    assert.ok(revert, 'Phase 2 restore rule missing');
    assert.ok(newFile, 'new-file rule missing');
    assert.ok(noReviewer, 'no-reviewer rule missing');
  });

  test('keeps the Flags no-approval carve-out for implement-spec Clarify questions', () => {
    // Arrange
    const text = skillMd('review-code-changes');
    // Act
    const noApproval = /^- Flags: .*This skill itself asks no approval question and no question of its own/m.test(text);
    const carveOut = /^- Flags: .*; cdk:implement-spec may ask its own Clarify questions\.$/m.test(text);
    // Assert
    assert.ok(noApproval, 'no-approval sentence missing');
    assert.ok(carveOut, 'Clarify carve-out missing');
  });

  test('names the test file in each fix spec goal', () => {
    // Arrange
    const text = readFileSync(join(root, 'skills', 'review-code-changes', 'references', 'fix.md'), 'utf8');
    // Act
    const rule = /^- Goals: .*and the test file to add or update/m.test(text);
    // Assert
    assert.ok(rule, 'test file in goals missing');
  });

  test('scopes the fix spec writes to the goal and test files', () => {
    // Arrange
    const text = readFileSync(join(root, 'skills', 'review-code-changes', 'references', 'fix.md'), 'utf8');
    // Act
    const rule =
      /^- Write scope: exactly the goal files and the test files they name, the set written to `paths\.txt`; never overwrite a user hunk/m.test(
        text
      );
    // Assert
    assert.ok(rule, 'write-scope sentence missing');
  });

  test('ends a user cancel with the user cancelled stop reason', () => {
    // Arrange
    const fix = readFileSync(join(root, 'skills', 'review-code-changes', 'references', 'fix.md'), 'utf8');
    // Act
    const inFix =
      /^Its reported outcome is the verification result.*a cancel is `Stopped: <step>: user cancelled`/m.test(fix);
    // Assert
    assert.ok(inFix, 'fix.md cancel literal missing');
  });

  test('ends a round-cap stop with the round cap stop reason', () => {
    // Arrange
    const text = skillMd('review-code-changes');
    // Act
    const rule =
      /^- Caps: .*`round cap`, `blocking count did not decrease`, `no fix applied`, or `verification failed`; a dismissed `cdk:implement-spec` question ends with `Stopped: <step>: user cancelled`/m.test(
        text
      );
    // Assert
    assert.ok(rule, 'round-cap stop rule missing');
  });

  test('re-judges the reported items only and skips the re-review when no fix changed a file', () => {
    // Arrange
    const skill = skillMd('review-code-changes');
    const review = readFileSync(join(root, 'skills', 'review-code-changes', 'references', 'review.md'), 'utf8');
    const fix = readFileSync(join(root, 'skills', 'review-code-changes', 'references', 'fix.md'), 'utf8');
    // Act
    const step =
      /^6\. \*\*Re-judge the reported items\.\*\*.*\n {3}- 6a\. Re-judge only the prior blocking findings \(`threads`\); no first-review kind runs and no new finding enters\./m.test(
        skill
      );
    const empty =
      /5e\. Run `delta`; an empty delta \(no file changed\) → `Verdict: BLOCKED`, `Stopped: 5: no fix applied`, skip step 6/.test(
        skill
      );
    const later = /Rounds after the first judge the reported items only:.*No first-review kind and no sweep runs/.test(
      review
    );
    const fixDelta =
      /an empty delta \(no changed path\) means no fix was applied: stop with `Stopped: 5: no fix applied`/.test(fix);
    const diffOnly =
      /judge only the diff hunks; callers and callees are read-only context, requested through `Need:`/.test(review);
    const stale = /Dropped:|regression filter|blocking finding repeated/.test(skill + review + fix);
    // Assert
    assert.ok(step, 'step 6 re-judge wording missing');
    assert.ok(empty, 'step 5e empty-delta stop missing');
    assert.ok(later, 'review.md later-rounds rule missing');
    assert.ok(fixDelta, 'fix.md empty-delta rule missing');
    assert.ok(diffOnly, 'first-review diff-only rule missing');
    assert.equal(stale, false);
  });

  test('fences every quoted fix spec field and counts one real Write scope line', () => {
    // Arrange
    const text = readFileSync(join(root, 'skills', 'review-code-changes', 'references', 'fix.md'), 'utf8');
    // Act
    const fenced =
      /^- Goals: .*each quoted field in a fenced block \(backticks or `~~~`\) whose fence is longer than any run of its own character inside it \(so a quoted fence line cannot close it early and a quoted `Write scope:` or `Target directory:` line never counts\)/m.test(
        text
      );
    const oldFenced = /or a `~~~` fence/.test(text);
    const oneLine = /^- Write scope: .*write it as one `Write scope:` line outside any fenced block\./m.test(text);
    // Assert
    assert.ok(fenced, 'fenced field rule missing in fix.md');
    assert.equal(oldFenced, false);
    assert.ok(oneLine, 'single Write scope line rule missing in fix.md');
  });

  test('leaves reverted Phase 2 files out of the commit paths', () => {
    // Arrange
    const skill = skillMd('review-code-changes');
    const fix = readFileSync(join(root, 'skills', 'review-code-changes', 'references', 'fix.md'), 'utf8');
    // Act
    const fixRule =
      /^- `paths:` comes from the `scope` manifest: every reviewed file that is not skipped, plus any new file of an accepted \(verified\) fix run created inside the write scope, so a dirty file outside the review is never committed\. When Phase 2 was reverted, leave out of `paths:` every file Phase 2 created or touched outside its snapshot and list them only under `Open:`\.$/m.test(
        fix
      );
    const skillRule =
      /^ {3}- 8b\. .* with `paths:` listing the reviewed, non-skipped manifest files plus any new file of an accepted \(verified\) fix run created inside the write scope, and none that a reverted Phase 2 created or touched outside its snapshot \(those go under `Open:`\), and `--yes` only when the user passed it\.$/m.test(
        skill
      );
    const stale = /plus any new file a fix created inside the write scope/.test(skill + fix);
    // Assert
    assert.ok(fixRule, 'fix.md reverted Phase 2 paths rule missing');
    assert.ok(skillRule, 'SKILL.md step 8b reverted Phase 2 paths rule missing');
    assert.equal(stale, false);
  });

  test('prints the Round line and the Unaddressed line in the Output', () => {
    // Arrange
    const text = skillMd('review-code-changes');
    // Act
    const round = /^Round <n>: Open <n> \(critical <a>, major <b>\)$/m.test(text);
    const unaddressed = /^Unaddressed: <key \[nit\|question\] <path>:<line> — problem>, … \| none$/m.test(text);
    const verdict = /^Verdict: APPROVE \| BLOCKED$/m.test(text);
    // Assert
    assert.ok(round, 'Round line missing');
    assert.ok(unaddressed, 'Unaddressed line missing');
    assert.ok(verdict, 'Verdict line missing');
  });
});
