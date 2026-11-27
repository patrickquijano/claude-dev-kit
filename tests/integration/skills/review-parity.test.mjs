import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (...parts) => readFileSync(join(root, ...parts), 'utf8');
const skills = ['review-code-changes', 'review-github-pull-request', 'review-gitlab-merge-request'];
const twins = [
  { skill: 'review-github-pull-request', unit: 'thread' },
  { skill: 'review-gitlab-merge-request', unit: 'discussion' }
];
const sources = [
  { name: 'agents/code-reviewer.md', text: read('agents', 'code-reviewer.md') },
  ...skills.map((s) => ({ name: `${s}/SKILL.md`, text: read('skills', s, 'SKILL.md') }))
];
const START = 'Each finding carries exactly one severity:';
const END = /Finding key: [^\n]*\n/;
const block = (text) => {
  const a = text.indexOf(START);
  const m = END.exec(text.slice(a));
  return a < 0 || !m ? '' : text.slice(a, a + m.index + m[0].length);
};

describe('review severity text', () => {
  test('is identical in the agent and the three skills', () => {
    // Arrange
    const reference = block(sources[0].text);
    // Act
    const differing = sources.filter((s) => block(s.text) !== reference).map((s) => s.name);
    // Assert
    assert.notEqual(reference, '');
    assert.deepEqual(differing, []);
  });

  test('gives every severity a calibration anchor', () => {
    // Arrange
    const levels = ['critical', 'major', 'minor', 'nit', 'question'];
    const text = block(sources[0].text);
    // Act
    const missing = levels.filter(
      (l) => !text.split('\n').some((line) => line.startsWith(`- \`${l}\``) && line.includes(' Anchor: '))
    );
    // Assert
    assert.deepEqual(missing, []);
  });

  test('lets only critical and major block and carries a line-free key', () => {
    // Arrange
    const text = block(sources[0].text);
    // Act
    const rule = /Only `critical` and `major` block, in every skill and every round;/.test(text);
    const key = /Finding key: `<file>:<category>:<short-description>`.*no line number/.test(text);
    // Assert
    assert.ok(rule, 'blocking rule missing');
    assert.ok(key, 'finding key missing');
  });

  test('has no stale minor-gating or local-only blocking sentence anywhere in the review files', () => {
    // Arrange
    const stale = /must be resolved before approval|In local review, only critical and major block/;
    const files = [
      read('agents', 'code-reviewer.md'),
      ...skills.flatMap((s) =>
        [
          'SKILL.md',
          'references/review.md',
          'references/analyze.md',
          'references/threads.md',
          'references/post.md'
        ].flatMap((f) => {
          try {
            return [read('skills', s, f)];
          } catch (err) {
            if (err?.code !== 'ENOENT') throw err;
            return [];
          }
        })
      )
    ];
    // Act
    const hits = files.filter((t) => stale.test(t));
    // Assert
    assert.deepEqual(hits, []);
  });

  test('agent sets APPROVE when no critical or major finding exists and caps thread reasons', () => {
    // Arrange
    const agent = sources[0].text;
    // Act
    const verdict = /Set `Verdict:` .* to `BLOCK` when any finding is `critical` or `major`, else `APPROVE`\./.test(
      agent
    );
    const cap =
      /Kind `threads`: one line per listed thread id, never dropped,.*at most 20 words and never cap the number of lines\./.test(
        agent
      );
    // Assert
    assert.ok(verdict, 'verdict rule missing');
    assert.ok(cap, 'threads return cap missing');
  });
});

describe('review PR and MR twins stay symmetric', () => {
  for (const { skill, unit } of twins) {
    const skillMd = read('skills', skill, 'SKILL.md');
    const analyze = read('skills', skill, 'references', 'analyze.md');
    const threads = read('skills', skill, 'references', 'threads.md');
    const post = read('skills', skill, 'references', 'post.md');

    test(`${skill} gates on critical and major ${unit}s only`, () => {
      // Arrange
      const rule = `- Gating ${unit}s are the own \`[critical]\` and \`[major]\` ${unit}s, cleared only when resolved. \`[minor]\`, \`[nit]\`, and \`[question]\` ${unit}s never gate`;
      // Act
      const found = skillMd.split('\n').some((line) => line.startsWith(rule));
      // Assert
      assert.ok(found, 'gating rule missing');
    });

    test(`${skill} verdict table blocks on critical or major only and approves with non-blocking items`, () => {
      // Arrange
      const blocking = /or any kept `critical` or `major` finding \| `REQUEST_CHANGES` \|/;
      const approving =
        /\| Otherwise; kept `minor`, `nit`, `question`, and `Unverified` items are posted as non-gating \| `APPROVE` \|/;
      // Act
      const results = [blocking.test(analyze), approving.test(analyze)];
      // Assert
      assert.deepEqual(results, [true, true]);
    });

    test(`${skill} re-reviews only the delta since the approved SHA with a full-diff fallback`, () => {
      // Arrange
      const mode =
        /^- Own approval and the head SHA differs → \*\*re-review\*\*: only the first review covers the whole (PR|MR), so the scope is the changes since the approved SHA/m;
      const fallback = /When there is no last reviewed SHA or that compare fails/;
      const stale = /→ \*\*first review\*\* \(a new summary; later runs use the newest\)/;
      // Act
      const results = [mode.test(threads), fallback.test(analyze), stale.test(threads)];
      // Assert
      assert.deepEqual(results, [true, true, false]);
    });

    test(`${skill} lists dropped re-review findings in the summary`, () => {
      // Arrange
      const rule = /listed in the summary under `Dropped:` as `<key \[severity\]>`/;
      const summary = /the re-review `Dropped:` items/;
      // Act
      const results = [rule.test(analyze), summary.test(post)];
      // Assert
      assert.deepEqual(results, [true, true]);
    });

    test(`${skill} downgrades a finding with no evidence or low confidence`, () => {
      // Arrange
      const rule =
        /a missing or `low` one is downgraded to `question`, and a `critical` or `major` needs quoted evidence and at least `medium`/;
      // Act
      const found = rule.test(analyze);
      // Assert
      assert.ok(found);
    });

    test(`${skill} matches own ${unit}s and duplicates by a line-free key`, () => {
      // Arrange
      const own = /same finding key: the same path and issue, whatever the line/;
      const stale = /overlapping line|path \+ line \+ issue/;
      // Act
      const results = [own.test(analyze), stale.test(analyze)];
      // Assert
      assert.deepEqual(results, [true, false]);
    });

    test(`${skill} posts non-blocking items under one cap of 5`, () => {
      // Arrange
      const rule = /at most 5 inline non-blocking `minor`, `nit`, or `question` findings/;
      // Act
      const found = rule.test(post);
      // Assert
      assert.ok(found);
    });
  }

  test('both skill descriptions stay within 400 chars and the MR one no longer says "in full"', () => {
    // Arrange
    const descriptions = twins.map(
      ({ skill }) => /^description: '?(.*?)'?$/m.exec(read('skills', skill, 'SKILL.md'))[1]
    );
    // Act
    const lengths = descriptions.map((d) => d.length <= 400);
    const inFull = descriptions.some((d) => /in full/.test(d));
    // Assert
    assert.deepEqual(lengths, [true, true]);
    assert.equal(inFull, false);
  });

  test('threads.md Mode rules match across the twins apart from host terms', () => {
    // Arrange
    const modes = twins.map(({ skill }) => {
      const t = read('skills', skill, 'references', 'threads.md');
      return t.slice(t.indexOf('- No own summary'), t.indexOf('## Digest')).replace(/\b(PR|MR)\b/g, 'X');
    });
    // Act
    const same = modes[0] === modes[1];
    // Assert
    assert.ok(same, 'Mode rules differ between the twins');
  });
});

describe('review-code-changes re-review state', () => {
  const skillMd = read('skills', 'review-code-changes', 'SKILL.md');
  const review = read('skills', 'review-code-changes', 'references', 'review.md');
  const commands = read('skills', 'review-code-changes', 'references', 'commands.md');

  test('keeps state in auto memory under a scoped grant and falls back to full scope', () => {
    // Arrange
    const grant = /^allowed-tools: .*Edit\(\/\/\*\*\/memory\/cdk-review-state-\*\.md\)/m;
    const rule = /^- Re-review state: only the first review of a branch covers the whole scope;/m;
    const fallback = /means full scope, never an error, and state is written only after a completed review/;
    // Act
    const results = [grant.test(skillMd), rule.test(skillMd), fallback.test(skillMd)];
    // Assert
    assert.deepEqual(results, [true, true, true]);
  });

  test('validates the branch line and commit, and writes only after a completed review', () => {
    // Arrange
    const valid = /valid only when its `branch:` line equals the current branch exactly/;
    const write = /Write \(step 9\): only after a completed review, meaning `Result: done` or a stop of `round cap`/;
    const delta = /the first-review kinds run on the delta manifest and keep every severity/;
    // Act
    const results = [valid.test(review), write.test(review), delta.test(review)];
    // Assert
    assert.deepEqual(results, [true, true, true]);
  });

  test('passes --since to scope and reads the branch through a granted command', () => {
    // Arrange
    const scope = /diff-manifest\.mjs scope --root <root> \[--since <commit>\]/;
    const branch = /\| `branch` \| `git branch --show-current` \|/;
    const grant = /^allowed-tools: .*Bash\(git branch --show-current\)/m;
    // Act
    const results = [scope.test(commands), branch.test(commands), grant.test(skillMd)];
    // Assert
    assert.deepEqual(results, [true, true, true]);
  });

  test('prints the Mode and Dropped lines in the Output', () => {
    // Arrange
    const mode = /^Mode: full \| delta since <short sha> \(<p> prior blocking: <f> fixed, <o> open\)$/m;
    const dropped = /^Dropped: <key \[severity\] — reason>, … \| none$/m;
    // Act
    const results = [mode.test(skillMd), dropped.test(skillMd)];
    // Assert
    assert.deepEqual(results, [true, true]);
  });
});
