import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const skillsDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'skills');
const names = readdirSync(skillsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const frontmatterOf = (text) => text.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? '';
const fieldOf = (front, key) =>
  front
    .split('\n')
    .find((l) => l.startsWith(`${key}: `))
    ?.slice(key.length + 2) ?? '';
const unquote = (value) => value.replace(/^(['"])([\s\S]*)\1$/, '$2');
const takesRecommended =
  /(unavailable|no way to ask|cannot ask)[^.\n]*→[^.\n]*(take|takes|use|uses) (the )?(Recommended|recommended)/;

describe('skill policy', () => {
  for (const name of names) {
    const text = readFileSync(join(skillsDir, name, 'SKILL.md'), 'utf8');
    const front = frontmatterOf(text);
    const modelInvocable = !/^disable-model-invocation: true$/m.test(front);
    const tools = unquote(fieldOf(front, 'allowed-tools'));

    if (modelInvocable) {
      test(`${name} description ends its scope with a Not for boundary`, () => {
        // Arrange
        const description = unquote(fieldOf(front, 'description'));
        // Act
        const boundary = /Not for [^.]+\./.test(description);
        // Assert
        assert.ok(boundary, `description: ${description}`);
      });
    }

    test(`${name} allowed-tools has no entry that starts its argument with a wildcard`, () => {
      // Arrange
      const entries = tools.match(/(?:^|\s)[A-Za-z_]+\(\*[^)\s]*\)?/g) ?? [];
      // Act
      const leading = entries.map((entry) => entry.trim()).filter((entry) => /^[A-Za-z_]+\(\*/.test(entry));
      // Assert
      assert.deepEqual(leading, []);
    });

    test(`${name} does not grant node -e`, () => {
      // Arrange
      const granted = tools.includes('node -e');
      // Act
      const none = !granted;
      // Assert
      assert.ok(none, 'allowed-tools grants node -e');
    });

    test(`${name} never takes the Recommended option and writes nothing for the same missing-ask condition`, () => {
      // Arrange
      const takes = takesRecommended.test(text);
      const writesNothing = /write nothing/.test(text);
      // Act
      const both = takes && writesNothing;
      // Assert
      assert.equal(both, false);
    });
  }

  test('delete-branches grants no host api command', () => {
    // Arrange
    const front = frontmatterOf(readFileSync(join(skillsDir, 'delete-branches', 'SKILL.md'), 'utf8'));
    // Act
    const tools = fieldOf(front, 'allowed-tools');
    // Assert
    assert.doesNotMatch(tools, /gh api|glab api/);
    assert.match(tools, /host-get\.mjs/);
  });

  for (const skill of [
    'review-github-pull-request',
    'address-github-pull-request-review',
    'create-github-issue',
    'create-github-release'
  ]) {
    test(`${skill} grants no gh api and only the gh-get wrapper`, () => {
      // Arrange
      const front = frontmatterOf(readFileSync(join(skillsDir, skill, 'SKILL.md'), 'utf8'));
      // Act
      const tools = fieldOf(front, 'allowed-tools');
      // Assert
      assert.doesNotMatch(tools, /gh api/);
      assert.match(tools, /scripts\/gh-get\.mjs \*/);
    });
  }

  test('review-gitlab-merge-request grants literal glab --help commands and no wildcard help grant', () => {
    // Arrange
    const front = frontmatterOf(readFileSync(join(skillsDir, 'review-gitlab-merge-request', 'SKILL.md'), 'utf8'));
    const tools = fieldOf(front, 'allowed-tools');
    const subcommands = [
      'auth status',
      'mr view',
      'mr diff',
      'mr list',
      'issue view',
      'mr approve',
      'mr unapprove',
      'api'
    ];
    // Act
    const missing = subcommands.filter((sub) => !tools.includes(`Bash(glab ${sub} --help)`));
    // Assert
    assert.deepEqual(missing, []);
    assert.doesNotMatch(tools, /glab \* --help/);
  });

  test('build-skill rules and template carry the canonical no-ask wording', () => {
    // Arrange
    const rules = readFileSync(join(skillsDir, 'build-skill', 'references', 'rules.md'), 'utf8');
    const template = readFileSync(join(skillsDir, 'build-skill', 'assets', 'SKILL.template.md'), 'utf8');
    // Act
    const wording = 'Result: stopped`, `Stopped: <step>: cannot interact`';
    // Assert
    assert.ok(rules.includes(wording));
    assert.ok(template.includes(wording));
    assert.ok(rules.includes('Only `--yes` takes the Recommended option.'));
  });

  test('no skill takes the Recommended option when it cannot ask or stops on unattended or unknown input', () => {
    // Arrange
    const banned = [/unavailable → take the Recommended/, /Stopped: \d+: (unattended|unknown input)/];
    // Act
    const hits = names.flatMap((name) => {
      const text = readFileSync(join(skillsDir, name, 'SKILL.md'), 'utf8');
      return banned.filter((re) => re.test(text)).map((re) => `${name}: ${re}`);
    });
    // Assert
    assert.deepEqual(hits, []);
  });

  describe('unattended wording that continues when it cannot ask', () => {
    const oldForm = /\b[Uu]nattended \([^)\n]*no way to ask\)|`--yes`,? or no way to ask/;

    test('the ban matches the old text and not the canonical wording', () => {
      // Arrange
      const rules = readFileSync(join(skillsDir, 'build-skill', 'references', 'rules.md'), 'utf8');
      const canonical = 'No user to reply (headless) and no `--yes` → write nothing, `Result: stopped`';
      const samples = [
        'Unattended (no way to ask): ask nothing;',
        'unattended (`--yes`, or no way to ask) writes only high candidates',
        '`--yes` or no way to ask → ask nothing'
      ];
      // Act
      const matched = samples.map((sample) => oldForm.test(sample));
      // Assert
      assert.ok(rules.includes(canonical));
      assert.equal(oldForm.test(rules), false);
      assert.deepEqual(matched, [true, true, true]);
    });

    test('each aligned no-ask site states the cannot-interact stop', () => {
      // Arrange
      const sites = [
        'update-gitignore/SKILL.md',
        'update-rules/SKILL.md',
        'update-rules/references/repeats.md',
        'update-rules/references/flow.md',
        'update-editorconfig/SKILL.md',
        'update-editorconfig/references/flow.md',
        'upgrade-dependencies/SKILL.md',
        'update-readme/references/flow.md',
        'rebase-onto/SKILL.md',
        'setup-husky/references/hooks.md'
      ];
      // Act
      const missing = sites.filter(
        (site) => !/Stopped: (\d+|<step>): cannot interact/.test(readFileSync(join(skillsDir, site), 'utf8'))
      );
      // Assert
      assert.deepEqual(missing, []);
    });

    test('rebase-onto aborts the rebase before the headless cannot-interact stop', () => {
      // Arrange
      const text = readFileSync(join(skillsDir, 'rebase-onto', 'SKILL.md'), 'utf8');
      // Act
      const line = text.split('\n').find((l) => /cannot interact/.test(l)) ?? '';
      // Assert
      assert.match(line, /rebase-abort[^\n]*cannot interact/);
    });

    test('no skill markdown file continues when it has no way to ask', () => {
      // Arrange
      const files = readdirSync(skillsDir, { recursive: true }).filter((file) => file.endsWith('.md'));
      // Act
      const hits = files.filter((file) => oldForm.test(readFileSync(join(skillsDir, file), 'utf8')));
      // Assert
      assert.deepEqual(hits, []);
    });
  });

  describe('--yes wording', () => {
    const askRecord = /Ask \(unattended: record\)/;
    const allowedForms = /`--yes` (?:runs unattended|= unattended):|\(unattended: no questions/g;
    const bareUnattended = /\b[Uu]nattended\s*(?::|→|->)|^#+\s+Unattended\b/m;
    const isBare = (text) => bareUnattended.test(text.replaceAll(allowedForms, ''));
    const markdownFiles = readdirSync(skillsDir, { recursive: true })
      .filter((file) => file.endsWith('.md') && !file.endsWith('evals.md'))
      .sort();

    test('the ask-record ban matches the old line and not the --yes form', () => {
      // Arrange
      const bad = 'Ask (unattended: record) what the input and repo cannot answer.';
      const good = 'Ask what the input and repo cannot answer (`--yes`: record it instead).';
      // Act
      const matched = [askRecord.test(bad), askRecord.test(good)];
      // Assert
      assert.deepEqual(matched, [true, false]);
    });

    test('no skill markdown file asks with the unattended: record form', () => {
      // Arrange
      const files = markdownFiles;
      // Act
      const hits = files.filter((file) => askRecord.test(readFileSync(join(skillsDir, file), 'utf8')));
      // Assert
      assert.deepEqual(hits, []);
    });

    test('the bare unattended ban matches bad samples and not the allowed forms', () => {
      // Arrange
      const bad = [
        'ask (unattended: `Open:`).',
        'Unattended → keep the name',
        'a user (unattended -> skip)',
        '## Unattended',
        '- Unattended: ask nothing;'
      ];
      const good = [
        '- Flags: `--yes` runs unattended: no questions, recommended options taken',
        '- Flags: `--yes` = unattended: no questions',
        'Fixed text (unattended: no questions, recommended options taken)',
        '- Unattended (`--yes`): ask nothing;',
        'ask (`--yes`: `Open:`).',
        '## `--yes`'
      ];
      // Act
      const matched = [bad.map(isBare), good.map(isBare)];
      // Assert
      assert.deepEqual(matched, [bad.map(() => true), good.map(() => false)]);
    });

    test('no skill markdown file outside evals uses a bare unattended for --yes', () => {
      // Arrange
      const files = markdownFiles;
      // Act
      const hits = files.filter((file) => isBare(readFileSync(join(skillsDir, file), 'utf8')));
      // Assert
      assert.deepEqual(hits, []);
    });
  });

  describe('headless stop', () => {
    const asksUser = (text) =>
      /AskUserQuestion/.test(unquote(fieldOf(frontmatterOf(text), 'allowed-tools'))) ||
      text.split('\n').some((line) => /^\d+[a-z]?\. /.test(line) && /\b[Aa]sk\b/.test(line));
    const rulesOnlyAskers = [
      'address-github-pull-request-review',
      'address-gitlab-merge-request-review',
      'audit-code-security',
      'commit-changes',
      'open-github-pull-request',
      'open-gitlab-merge-request',
      'setup-dotnet-api',
      'setup-laravel-api',
      'setup-nextjs-app',
      'setup-spec-kit',
      'update-rules',
      'upgrade-dependencies'
    ];
    const nonAskers = [
      'create-git-tag',
      'push-commits',
      'push-tags',
      'review-github-pull-request',
      'review-gitlab-merge-request'
    ];
    const askInline = /a user can reply → ask [^.\n]*numbered inline list[^.\n]*stop for/;
    const onlyYes = /\b[Oo]nly `--yes` takes the Recommended option\b/;
    const writeNothing = /write nothing/;
    const writeNothingExceptions = {
      'build-hook': {
        reason: 'the step-1 interact check runs before anything is written',
        form: /Stopped: 1: cannot interact/
      },
      'merge-github-pull-request': { reason: 'the merge is the only write', form: /merge nothing/ },
      'merge-gitlab-merge-request': { reason: 'the merge is the only write', form: /merge nothing/ },
      'rebase-onto': { reason: 'the stop aborts the rebase', form: /rebase-abort[^\n]*cannot interact/ }
    };
    const skillText = (name) => readFileSync(join(skillsDir, name, 'SKILL.md'), 'utf8');
    const stopFiles = (name) =>
      readdirSync(join(skillsDir, name), { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith('.md') && entry.name !== 'evals.md')
        .map((entry) => readFileSync(join(entry.parentPath, entry.name), 'utf8'));
    const detected = names.filter((name) => asksUser(skillText(name)));
    const checked = [...new Set([...detected, ...rulesOnlyAskers])].sort();

    test('asksUser detects a frontmatter AskUserQuestion grant', () => {
      // Arrange
      const text = '---\nname: x\nallowed-tools: Read, AskUserQuestion\n---\n# x\n';
      // Act
      const asks = asksUser(text);
      // Assert
      assert.equal(asks, true);
    });

    test('asksUser detects a numbered step line that asks', () => {
      // Arrange
      const text = '---\nname: x\nallowed-tools: Read\n---\n1. **Pick.** Ask which one.\n';
      // Act
      const asks = asksUser(text);
      // Assert
      assert.equal(asks, true);
    });

    test('asksUser ignores a skill with neither signal', () => {
      // Arrange
      const text = '---\nname: x\nallowed-tools: Read\n---\n1. **Run.** Print the result.\n';
      // Act
      const asks = asksUser(text);
      // Assert
      assert.equal(asks, false);
    });

    test('asksUser ignores ask in an unnumbered line and a word that only contains ask', () => {
      // Arrange
      const text = '---\nname: x\nallowed-tools: Read\n---\n- Ask first.\n1. **Run.** Handle the task mask.\n';
      // Act
      const asks = asksUser(text);
      // Assert
      assert.equal(asks, false);
    });

    test('at least 49 skills are checked for the cannot-interact stop', () => {
      // Arrange
      const minimum = 49;
      // Act
      const count = checked.length;
      // Assert
      assert.ok(count >= minimum, `checked ${count}: ${checked.join(', ')}`);
    });

    test('the Rules-only askers are real skills', () => {
      // Arrange
      const missing = rulesOnlyAskers.filter((name) => !names.includes(name));
      // Act
      const result = missing;
      // Assert
      assert.deepEqual(result, []);
    });

    test('the known non-askers are not detected as askers', () => {
      // Arrange
      const wrong = nonAskers.filter((name) => asksUser(skillText(name)));
      // Act
      const result = wrong;
      // Assert
      assert.deepEqual(result, []);
    });

    for (const name of names) {
      test(`${name} carries the cannot-interact stop when it asks`, () => {
        // Arrange
        const needs = checked.includes(name);
        // Act
        const stop = stopFiles(name).some((text) => /Stopped: (\d+|<step>): cannot interact/.test(text));
        // Assert
        assert.ok(!needs || stop);
      });
    }

    for (const name of checked) {
      test(`${name} states the inline-list ask, the --yes-only Recommended rule, and the headless write-nothing stop`, () => {
        // Arrange
        const text = stopFiles(name).join('\n');
        const nothing = writeNothingExceptions[name]?.form ?? writeNothing;
        // Act
        const found = [askInline.test(text), onlyYes.test(text), nothing.test(text)];
        // Assert
        assert.deepEqual(found, [true, true, true]);
      });
    }

    test('each write-nothing exception names a checked skill', () => {
      // Arrange
      const keys = Object.keys(writeNothingExceptions);
      // Act
      const unchecked = keys.filter((key) => !checked.includes(key));
      // Assert
      assert.deepEqual(unchecked, []);
    });

    test('build-skill SKILL.md alone carries every canonical no-ask clause', () => {
      // Arrange
      const text = skillText('build-skill');
      // Act
      const found = [askInline.test(text), onlyYes.test(text), writeNothing.test(text)];
      // Assert
      assert.deepEqual(found, [true, true, true]);
    });

    test('the takes-Recommended ban does not match the canonical no-ask rule in build-skill rules', () => {
      // Arrange
      const rules = readFileSync(join(skillsDir, 'build-skill', 'references', 'rules.md'), 'utf8');
      // Act
      const matched = takesRecommended.test(rules);
      // Assert
      assert.equal(matched, false);
    });

    test('the inline-list clause matches good samples and not bad ones', () => {
      // Arrange
      const good = [
        'AskUserQuestion unavailable but a user can reply → ask as a numbered inline list and stop for the answer.',
        'unavailable but a user can reply → ask as a numbered inline list, then stop for the reply'
      ];
      const bad = [
        'a user can reply → take the Recommended option',
        'a user can reply → ask as a numbered list and stop for the answer.'
      ];
      // Act
      const matched = [good.map((s) => askInline.test(s)), bad.map((s) => askInline.test(s))];
      // Assert
      assert.deepEqual(matched, [
        [true, true],
        [false, false]
      ]);
    });

    test('the --yes-only clause matches good samples and not bad ones', () => {
      // Arrange
      const good = ['Only `--yes` takes the Recommended option.', '- only `--yes` takes the Recommended option'];
      const bad = ['`--yes` takes the Recommended option.', 'Only `--yes` takes the Recommended options.'];
      // Act
      const matched = [good.map((s) => onlyYes.test(s)), bad.map((s) => onlyYes.test(s))];
      // Assert
      assert.deepEqual(matched, [
        [true, true],
        [false, false]
      ]);
    });

    test('setup-husky asks no question before its foreign hook-owner check in step 5', () => {
      // Arrange
      const step = skillText('setup-husky')
        .split('\n')
        .find((line) => line.startsWith('5. '));
      // Act
      const owner = step.search(/foreign `core\.hooksPath`/);
      const question = step.search(/\b[Aa]sk\b/);
      // Assert
      assert.ok(owner >= 0, 'step 5 names the foreign core.hooksPath check');
      assert.ok(question >= 0, 'step 5 asks');
      assert.ok(owner < question, `owner check at ${owner}, first ask at ${question}`);
    });

    for (const name of ['build-skill', 'build-subagent']) {
      test(`${name} evals list cannot interact among the implement-spec input stops`, () => {
        // Arrange
        const evals = readFileSync(join(skillsDir, name, 'references', 'evals.md'), 'utf8');
        // Act
        const row = evals.split('\n').find((line) => line.startsWith('| implement-no-git'));
        // Assert
        assert.ok(row?.includes('(`needs input`, `no input`, `cannot interact`, or cancelled)'));
      });
    }

    test('setup-husky stops at step 5 when it cannot interact and has no later stop numbers', () => {
      // Arrange
      const text = readFileSync(join(skillsDir, 'setup-husky', 'SKILL.md'), 'utf8');
      const files = readdirSync(join(skillsDir, 'setup-husky'), { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
        .map((entry) => readFileSync(join(entry.parentPath, entry.name), 'utf8'));
      // Act
      const stale = files.filter((content) => /Stopped: (9|10)\b/.test(content));
      // Assert
      assert.ok(text.includes('Stopped: 5: cannot interact'));
      assert.ok(files.length >= 3);
      assert.deepEqual(stale, []);
    });
  });
});
