import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  collect,
  frontmatterField,
  hookLines,
  isSafePath,
  main
} from '../../../../../skills/update-readme/scripts/components.mjs';

// Stub fs: `files` maps path → text; `dirs` maps path → entries.
function stub(files, dirs = {}) {
  const out = [];
  const err = [];
  return {
    out,
    err,
    readFile: (p) => files[p],
    exists: (p) => p in files,
    listDir: (p) => dirs[p] ?? [],
    log: (t) => out.push(t),
    error: (t) => err.push(t)
  };
}

describe('isSafePath', () => {
  test('accepts an absolute safe path', () => {
    // Act
    const results = [isSafePath('/a/b'), isSafePath('/x/my-plugin_1')];
    // Assert
    assert.deepEqual(results, [true, true]);
  });

  test('rejects relative, dotdot, and metacharacter paths', () => {
    // Act
    const results = [isSafePath('a'), isSafePath('/a/../b'), isSafePath('/a;b'), isSafePath('/a b')];
    // Assert
    assert.deepEqual(results, [false, false, false, false]);
  });
});

describe('frontmatterField', () => {
  test('reads a plain and a quoted value', () => {
    // Act
    const plain = frontmatterField('---\nname: x\ndescription: Does it. Use now.\n---\nbody', 'description');
    const quoted = frontmatterField('---\ndescription: "A: b"\n---\n', 'description');
    // Assert
    assert.equal(plain, 'Does it. Use now.');
    assert.equal(quoted, 'A: b');
  });

  test('joins a block scalar', () => {
    // Act
    const value = frontmatterField('---\ndescription: >\n  one\n  two\nname: x\n---\n', 'description');
    // Assert
    assert.equal(value, 'one two');
  });

  test('returns empty for a missing key or no frontmatter', () => {
    // Act
    const results = [frontmatterField('---\nname: x\n---\n', 'description'), frontmatterField('no front', 'name')];
    // Assert
    assert.deepEqual(results, ['', '']);
  });

  test('ignores a key that appears only in the body', () => {
    // Act
    const value = frontmatterField('---\nname: x\n---\ndescription: body\n', 'description');
    // Assert
    assert.equal(value, '');
  });
});

describe('hookLines', () => {
  test('lists each event with its script and matcher, including exec-form args', () => {
    // Arrange
    const json = JSON.stringify({
      hooks: {
        Stop: [{ hooks: [{ command: 'node "${CLAUDE_PLUGIN_ROOT}/hooks/scripts/stop.mjs"' }] }],
        SubagentStop: [{ matcher: 'm', hooks: [{ command: 'node', args: ['/p/subagent-stop.mjs'] }] }]
      }
    });
    // Act
    const lines = hookLines(json);
    // Assert
    assert.deepEqual(lines, [
      'Stop — hooks/hooks.json — runs stop.mjs',
      'SubagentStop — hooks/hooks.json — runs subagent-stop.mjs (matcher m)'
    ]);
  });

  test('reports an event with no command', () => {
    // Act
    const lines = hookLines('{"hooks":{"Stop":[]}}');
    // Assert
    assert.deepEqual(lines, ['Stop — hooks/hooks.json — runs no command']);
  });

  test('throws on invalid JSON', () => {
    // Act and Assert
    assert.throws(() => hookLines('{'), SyntaxError);
  });

  test('throws when there is no hooks object', () => {
    // Act and Assert
    assert.throws(() => hookLines('{}'), /no hooks object/);
  });
});

describe('collect', () => {
  const plugin = {
    '/r/.claude-plugin/plugin.json': '{}',
    '/r/skills/b/SKILL.md': '---\nname: b\ndescription: Bee.\n---\n',
    '/r/skills/a/SKILL.md': '---\nname: a\ndescription: Ay.\n---\n',
    '/r/agents/z.md': '---\nname: z\ndescription: Zed.\n---\n'
  };
  const dirs = {
    '/r/skills': [
      { name: 'b', dir: true },
      { name: 'a', dir: true },
      { name: 'stray.md', dir: false }
    ],
    '/r/agents': [
      { name: 'z.md', dir: false },
      { name: 'notes.txt', dir: false }
    ]
  };

  test('lists every skill and agent sorted, with counts and no hooks file', () => {
    // Act
    const text = collect('/r', stub(plugin, dirs));
    // Assert
    assert.equal(
      text,
      [
        'Skills (2):',
        'a — skills/a/SKILL.md — Ay.',
        'b — skills/b/SKILL.md — Bee.',
        'Agents (1):',
        'z — agents/z.md — Zed.',
        'Hooks (0):',
        ''
      ].join('\n')
    );
  });

  test('does not cap a long list', () => {
    // Arrange
    const files = { '/r/.claude-plugin/plugin.json': '{}' };
    const entries = [];
    for (let i = 0; i < 60; i++) {
      entries.push({ name: `s${i}`, dir: true });
      files[`/r/skills/s${i}/SKILL.md`] = `---\ndescription: d${i}\n---\n`;
    }
    // Act
    const text = collect('/r', stub(files, { '/r/skills': entries }));
    // Assert
    assert.match(text, /^Skills \(60\):/);
    assert.match(text, /s59 — skills\/s59\/SKILL\.md — d59/);
  });

  test('returns null when the root is not a plugin', () => {
    // Act
    const text = collect('/r', stub({}));
    // Assert
    assert.equal(text, null);
  });

  test('skips a skill directory without SKILL.md', () => {
    // Arrange
    const files = { '/r/.claude-plugin/plugin.json': '{}' };
    // Act
    const text = collect('/r', stub(files, { '/r/skills': [{ name: 'empty', dir: true }] }));
    // Assert
    assert.match(text, /^Skills \(0\):/);
  });
});

describe('main', () => {
  test('prints the report and returns 0 for a plugin root', () => {
    // Arrange
    const d = stub({ '/r/.claude-plugin/plugin.json': '{}' });
    // Act
    const code = main(['/r/'], d);
    // Assert
    assert.equal(code, 0);
    assert.match(d.out[0], /^Skills \(0\):/);
  });

  test('prints the not-a-plugin line for a non-plugin root', () => {
    // Arrange
    const d = stub({});
    // Act
    const code = main(['/r'], d);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(d.out, ['Components: none (not a plugin)']);
  });

  test('returns 2 for a missing or unsafe argument', () => {
    // Arrange
    const d = stub({});
    // Act
    const codes = [main([], d), main(['rel'], d), main(['/a', '/b'], d)];
    // Assert
    assert.deepEqual(codes, [2, 2, 2]);
    assert.equal(d.err.length, 3);
  });
});
