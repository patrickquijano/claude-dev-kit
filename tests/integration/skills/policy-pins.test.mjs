import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (...parts) => readFileSync(join(root, ...parts), 'utf8');
const allowedTools = (skill) => /^allowed-tools: .*$/m.exec(read('skills', skill, 'SKILL.md'))?.[0] ?? '';
const bashRules = (tools, command) =>
  tools
    .split('Bash(')
    .slice(1)
    .map((piece) => piece.trim().replaceAll('"', ''))
    .filter((rule) => rule.startsWith(`${command} `));
const overflow = (n) => ({
  test: (line) =>
    line.includes(
      `over the cap → keep the first ${n} lines and add \`+<k> more\` under \`Open:\`; never treat it as malformed.`
    )
});

describe('fixed policy pins', () => {
  test('build-dockerfile brief writes only the Dockerfile and the .dockerignore', () => {
    // Arrange
    const text = read('skills', 'build-dockerfile', 'references', 'briefs.md');
    // Act
    const scope = text.match(/^Write scope: .*$/m)?.[0];
    // Assert
    assert.equal(
      scope,
      'Write scope: <absolute path of Dockerfile in the app dir> <absolute path of .dockerignore at the context root>'
    );
  });

  for (const skill of ['build-github-action', 'build-github-workflow']) {
    test(`${skill} allows git ls-remote over https://github.com/ only`, () => {
      // Arrange
      const tools = allowedTools(skill);
      // Act
      const https = tools.includes('Bash(git ls-remote --tags --refs https://github.com/*)');
      // Assert
      assert.ok(https, 'https ls-remote rule missing');
      for (const rule of bashRules(tools, 'git ls-remote')) {
        assert.ok(
          rule.endsWith(' https://github.com/*)') || rule === 'git ls-remote --tags --refs origin)',
          `unguarded ls-remote rule: ${rule}`
        );
      }
    });

    test(`${skill} narrows gh api to the runner-images README`, () => {
      // Arrange
      const tools = allowedTools(skill);
      // Act
      const narrow = tools.includes(
        "Bash(gh api -H 'Accept: application/vnd.github.raw+json' repos/actions/runner-images/contents/README.md)"
      );
      // Assert
      assert.ok(narrow, 'narrow gh api rule missing');
      for (const rule of bashRules(tools, 'gh api')) {
        assert.ok(!rule.includes('*'), `wildcard gh api rule: ${rule}`);
      }
    });
  }

  test('setup-devcontainer passes the tag list through a scratch file, not a heredoc', () => {
    // Arrange
    const text = read('skills', 'setup-devcontainer', 'references', 'practices.md');
    // Act
    const scratch = text.includes('to a session scratch file outside the repo (never into the shell command text)');
    // Assert
    assert.ok(scratch, 'scratch-file wording missing');
    assert.doesNotMatch(text, /heredoc/i);
  });

  test('build-skill naming.md renames only on a broken hard rule or an ask', () => {
    // Arrange
    const line = read('skills', 'build-skill', 'references', 'naming.md').split('\n')[2];
    // Act
    const rule = line.includes(
      'in update and improve only when the current name breaks a hard rule or the user asks to rename (a rename moves the folder and breaks `/name` callers)'
    );
    // Assert
    assert.ok(rule, 'rename rule missing');
  });

  test('build-dockerfile practices stops at step 4 with no input under --yes', () => {
    // Arrange
    const text = read('skills', 'build-dockerfile', 'references', 'practices.md');
    // Act
    const stop = text.includes('`--yes`: no tag to take, so `Result: stopped`, `Stopped: 4: no input`, base image tag');
    // Assert
    assert.ok(stop, 'step 4 stop missing');
  });

  test('upgrade-dependencies skips a pip install without a virtual environment', () => {
    // Arrange
    const text = read('skills', 'upgrade-dependencies', 'references', 'managers.md');
    // Act
    const skip = text.includes("report that project's checks as `skipped (no venv)`, never as pass");
    // Assert
    assert.ok(skip, 'pip no-venv skip missing');
    assert.doesNotMatch(text, /python -m venv|virtualenv /);
  });
});

describe('release and permission pins', () => {
  test('release-check reader compares shas only and never tests ancestry', () => {
    // Arrange
    const text = read('.claude', 'skills', 'release-plugin', 'references', 'subagents.md');
    // Act
    const sha = text.includes('head-sha-equal: yes | no');
    // Assert
    assert.ok(sha, 'head-sha-equal return line missing');
    assert.match(text, /compare the two shas only; never test ancestry or merge state/);
    assert.match(text, /\(shas only, no ancestry test\)/);
  });

  test('release.md breaking list names slash commands and the subagent Return format', () => {
    // Arrange
    const text = read('.claude', 'rules', 'release.md');
    // Act
    const breaking = text.split('\n').find((l) => l.startsWith('- **Breaking**'));
    // Assert
    assert.match(breaking, /slash command/);
    assert.match(breaking, /`## Return`/);
  });

  for (const skill of ['setup-devcontainer', 'push-tags', 'create-git-tag', 'delete-branches']) {
    test(`${skill} allows no git -C rule`, () => {
      // Arrange
      const tools = allowedTools(skill);
      // Act
      const found = /git -C/.test(tools);
      // Assert
      assert.ok(tools.length > 0, 'allowed-tools line missing');
      assert.equal(found, false);
    });
  }
});

describe('return cap overflow rule', () => {
  const thirty = [
    'audit-skill',
    'audit-subagent',
    'build-docker-compose',
    'build-dockerfile',
    'build-github-action',
    'build-github-workflow',
    'build-gitlab-ci',
    'build-hook',
    'build-skill',
    'build-subagent',
    'setup-devcontainer',
    'upgrade-dependencies'
  ];
  for (const skill of thirty) {
    test(`${skill} briefs.md keeps the first 30 lines and reports +<k> more`, () => {
      // Arrange
      const line = read('skills', skill, 'references', 'briefs.md')
        .split('\n')
        .find((l) => /^Return: (cdk:)?implement-spec's Output block only/.test(l));
      // Act
      const found = overflow(30).test(line);
      // Assert
      assert.ok(found, 'overflow rule missing');
    });
  }

  test('build-docker-compose briefs.md keeps the first 20 reviewer lines', () => {
    // Arrange
    const line = read('skills', 'build-docker-compose', 'references', 'briefs.md')
      .split('\n')
      .find((l) => l.startsWith('Return: one line per missed item'));
    // Act
    const found = overflow(20).test(line);
    // Assert
    assert.ok(found, 'overflow rule missing');
  });

  test('build-docker-compose flow.md keeps the first 20 image-tag lines', () => {
    // Arrange
    const line = read('skills', 'build-docker-compose', 'references', 'flow.md')
      .split('\n')
      .find((l) => l.startsWith('- Step 5, image tags:'));
    // Act
    const found = overflow(20).test(line);
    // Assert
    assert.ok(found, 'overflow rule missing');
  });

  test('build-dockerfile flow.md keeps the first 80 reviewer lines', () => {
    // Arrange
    const line = read('skills', 'build-dockerfile', 'references', 'flow.md')
      .split('\n')
      .find((l) => l.startsWith('- Step 6, reviewer:'));
    // Act
    const found = overflow(80).test(line);
    // Assert
    assert.ok(found, 'overflow rule missing');
  });
});
