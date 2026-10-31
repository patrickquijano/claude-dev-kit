import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';
import { paint, render } from '../../../../../skills/update-statusline/assets/statusline.mjs';

const ESC = String.fromCharCode(27);
const BOLD = `${ESC}[1m`;
const MAGENTA = `${ESC}[35m`;
const RESET = `${ESC}[0m`;
const BRANCH = `${ESC}[38;5;205m`;
const INPUT = { cwd: '/work/app', model: { display_name: 'Model' } };
const NOW = 1_000;

const renderWith = (name) => render(INPUT, { nowSeconds: NOW, branch: () => name });

describe('render branch segment', () => {
  const noColor = process.env.NO_COLOR;

  afterEach(() => {
    if (noColor === undefined) {
      delete process.env.NO_COLOR;
    } else {
      process.env.NO_COLOR = noColor;
    }
  });

  test('emphasizes the branch name with bold and the branch color', () => {
    delete process.env.NO_COLOR;

    const line = renderWith('feat/x');

    assert.ok(line.includes(`${BOLD}${BRANCH}feat/x${RESET}`));
  });

  test('keeps the git( and ) wrapper in its own color', () => {
    delete process.env.NO_COLOR;

    const line = renderWith('main');

    assert.ok(line.includes(`${MAGENTA}git(${RESET}`));
    assert.ok(line.includes(`${MAGENTA})${RESET}`));
  });

  test('prints no escapes when NO_COLOR is set', () => {
    process.env.NO_COLOR = '1';

    const line = renderWith('main');

    assert.equal(line.includes(ESC), false);
    assert.ok(line.includes('git(main)'));
  });

  test('omits the branch segment without a branch', () => {
    delete process.env.NO_COLOR;

    const line = renderWith(null);

    assert.equal(line.includes('git('), false);
  });

  test('leaves the other segments unchanged', () => {
    delete process.env.NO_COLOR;

    const line = renderWith('main');

    assert.ok(line.includes(paint('app', `${ESC}[1m`, `${ESC}[36m`)));
    assert.ok(line.includes(paint('Model', `${ESC}[1m`, `${ESC}[34m`)));
  });
});
