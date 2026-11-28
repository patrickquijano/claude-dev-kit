import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { main, typedReload } from '../../../../.claude/hooks/user-prompt-submit.mjs';

const P = '/tmp/cdk-reload-s1.json';

// Stub deps; the marker holds one `/reload-plugins` entry.
function makeDeps(event) {
  const calls = { removes: [], writes: [] };
  const deps = {
    readJsonStdin: async () => event,
    tmp: '/tmp',
    marker: {
      readFile: () => JSON.stringify([{ file: 'skills/a.md', command: '/reload-plugins' }]),
      writeFile: (path, text) => calls.writes.push({ path, text }),
      remove: (path) => calls.removes.push(path)
    }
  };
  return { deps, calls };
}

describe('typedReload', () => {
  test('matches /reload-plugins', () => {
    // Arrange
    const prompt = '/reload-plugins';
    // Act
    const result = typedReload(prompt);
    // Assert
    assert.equal(result, '/reload-plugins');
  });

  test('matches /reload-plugins with --force and surrounding space', () => {
    // Arrange
    const prompt = '  /reload-plugins --force ';
    // Act
    const result = typedReload(prompt);
    // Assert
    assert.equal(result, '/reload-plugins');
  });

  test('matches /reload-skills', () => {
    // Arrange
    const prompt = '/reload-skills';
    // Act
    const result = typedReload(prompt);
    // Assert
    assert.equal(result, '/reload-skills');
  });

  test('ignores a prompt that only mentions the command', () => {
    // Arrange
    const prompt = 'please run /reload-plugins';
    // Act
    const result = typedReload(prompt);
    // Assert
    assert.equal(result, null);
  });

  test('ignores a longer command name', () => {
    // Arrange
    const prompt = '/reload-plugins-now';
    // Act
    const result = typedReload(prompt);
    // Assert
    assert.equal(result, null);
  });

  test('returns null for a non-string prompt', () => {
    // Arrange
    const prompt = undefined;
    // Act
    const result = typedReload(prompt);
    // Assert
    assert.equal(result, null);
  });
});

describe('main', () => {
  test('clears the marker when /reload-plugins is typed', async () => {
    // Arrange
    const { deps, calls } = makeDeps({ prompt: '/reload-plugins', session_id: 's1' });
    // Act
    const code = await main(deps);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(calls.removes, [P]);
  });

  test('keeps the marker for /reload-skills when the entry needs /reload-plugins', async () => {
    // Arrange
    const { deps, calls } = makeDeps({ prompt: '/reload-skills', session_id: 's1' });
    // Act
    const code = await main(deps);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(calls.removes, []);
  });

  test('passes an ordinary prompt through', async () => {
    // Arrange
    const { deps, calls } = makeDeps({ prompt: 'hello', session_id: 's1' });
    // Act
    const code = await main(deps);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual([...calls.removes, ...calls.writes], []);
  });

  test('does nothing without a session id', async () => {
    // Arrange
    const { deps, calls } = makeDeps({ prompt: '/reload-plugins' });
    // Act
    const code = await main(deps);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(calls.removes, []);
  });
});
