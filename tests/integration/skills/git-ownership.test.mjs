import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const skillsDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'skills');
const SWITCHER = 'switch-branch';
const COMMITTER = 'commit-changes';
const REBASE_EXEMPT = new Set(['rebase-onto']);

// A command starts at a backtick, a line start, `&& `, `; `, `$ `, or `Bash(`; "Never `git ...`" or "**Never** `git ...`" (any case) is a prohibition.
// BRANCH_SWITCH: `git switch|checkout` (not --ours, --theirs, the `--` separator), `git branch <name>` (not an option), `gh pr checkout`, `glab mr checkout`.
const BRANCH_SWITCH =
  /(?<!never |never\*\* )(?:`|^[ \t]*|&& |; |\$ |Bash\()(?:git (?:switch|checkout(?! --ours| --theirs| --(?:\s|`|$))|branch [^-\s`])|gh pr checkout|glab mr checkout)/im;
// COMMIT: `git commit` not followed by `-` (commit-tree).
const COMMIT = /(?<!never |never\*\* )(?:`|^[ \t]*|&& |; |\$ |Bash\()git commit(?!-)/im;

// `git -C <path>` and `git -c <key=value>` are dropped, so the command is matched as `git <cmd>`.
const matches = (pattern, text) => pattern.test(text.replaceAll(/ -C \S+/g, '').replaceAll(/ -c \S+/g, ''));

// Scope: markdown only (SKILL.md and references/ recursively); scripts and assets are not scanned.
const filesOf = (name) => {
  const dir = join(skillsDir, name);
  return readdirSync(dir, { recursive: true })
    .filter((file) => file.endsWith('.md') && (file === 'SKILL.md' || file.startsWith(`references${sep}`)))
    .map((file) => join(dir, file));
};

describe('git ownership patterns', () => {
  const violating = [
    ['BRANCH_SWITCH', BRANCH_SWITCH, '`git switch -c foo`'],
    ['BRANCH_SWITCH', BRANCH_SWITCH, 'Run `git checkout main`.'],
    ['BRANCH_SWITCH', BRANCH_SWITCH, 'Never `git switch` or `git checkout main`'],
    ['BRANCH_SWITCH', BRANCH_SWITCH, '`git -C <root> checkout main`'],
    ['BRANCH_SWITCH', BRANCH_SWITCH, '```\n  git switch -c foo\n```'],
    ['BRANCH_SWITCH', BRANCH_SWITCH, '`git branch feat/x`'],
    ['BRANCH_SWITCH', BRANCH_SWITCH, '`gh pr checkout 5`'],
    ['BRANCH_SWITCH', BRANCH_SWITCH, '`glab mr checkout 5`'],
    ['BRANCH_SWITCH', BRANCH_SWITCH, '`git checkout --detach x`'],
    ['BRANCH_SWITCH', BRANCH_SWITCH, '`git checkout --orphan x`'],
    ['BRANCH_SWITCH', BRANCH_SWITCH, 'cd x && git switch y'],
    ['COMMIT', COMMIT, '`git commit -S -F msg`'],
    ['COMMIT', COMMIT, '`git -C <root> commit -m x`'],
    ['COMMIT', COMMIT, '```\ngit commit -S\n```'],
    ['COMMIT', COMMIT, '`git -c k=v commit`'],
    ['COMMIT', COMMIT, 'allowed-tools: Bash(git commit *)']
  ];
  const allowed = [
    ['BRANCH_SWITCH', BRANCH_SWITCH, '`git checkout --ours -- f`'],
    ['BRANCH_SWITCH', BRANCH_SWITCH, '`git checkout --theirs -- f`'],
    ['BRANCH_SWITCH', BRANCH_SWITCH, '`git checkout -- f`'],
    ['BRANCH_SWITCH', BRANCH_SWITCH, '`git checkout --`'],
    ['BRANCH_SWITCH', BRANCH_SWITCH, 'Never `git switch`'],
    ['BRANCH_SWITCH', BRANCH_SWITCH, 'NEVER `git checkout`'],
    ['BRANCH_SWITCH', BRANCH_SWITCH, '`git branch -d x`'],
    ['BRANCH_SWITCH', BRANCH_SWITCH, '`git branch -D x`'],
    ['BRANCH_SWITCH', BRANCH_SWITCH, '`git branch --show-current`'],
    ['BRANCH_SWITCH', BRANCH_SWITCH, '`git branch --list`'],
    ['COMMIT', COMMIT, '`git commit-tree -S`'],
    ['COMMIT', COMMIT, 'Never `git commit`'],
    ['COMMIT', COMMIT, 'never `git commit`'],
    ['COMMIT', COMMIT, '**Never** `git commit`']
  ];

  for (const [label, pattern, text] of violating) {
    test(`${label} matches ${JSON.stringify(text)}`, () => {
      // Arrange
      const input = text;
      // Act
      const matched = matches(pattern, input);
      // Assert
      assert.equal(matched, true);
    });
  }

  for (const [label, pattern, text] of allowed) {
    test(`${label} skips ${JSON.stringify(text)}`, () => {
      // Arrange
      const input = text;
      // Act
      const matched = matches(pattern, input);
      // Assert
      assert.equal(matched, false);
    });
  }
});

describe('git ownership', () => {
  const names = readdirSync(skillsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  for (const name of names) {
    if (REBASE_EXEMPT.has(name)) continue;
    const files = filesOf(name);

    if (name !== SWITCHER) {
      test(`${name} never switches a branch`, () => {
        // Arrange
        const pattern = BRANCH_SWITCH;
        // Act
        const hits = files.filter((file) => matches(pattern, readFileSync(file, 'utf8')));
        // Assert
        assert.ok(files.length > 0);
        assert.deepEqual(hits, []);
      });
    }

    if (name !== COMMITTER) {
      test(`${name} never commits`, () => {
        // Arrange
        const pattern = COMMIT;
        // Act
        const hits = files.filter((file) => matches(pattern, readFileSync(file, 'utf8')));
        // Assert
        assert.ok(files.length > 0);
        assert.deepEqual(hits, []);
      });
    }
  }
});
