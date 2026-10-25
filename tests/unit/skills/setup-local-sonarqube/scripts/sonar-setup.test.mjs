import assert from 'node:assert/strict';
import path from 'node:path';
import { describe, test } from 'node:test';
import {
  compose,
  configure,
  detect,
  javaVersion,
  main,
  parseProperties,
  renderCompose,
  renderTasks,
  tags
} from '../../../../../skills/setup-local-sonarqube/scripts/sonar-setup.mjs';

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
    assert.equal(res.scanCommand, undefined);
    assert.equal(res.stop, undefined);
  });

  test('detects gradle when the build applies org.sonarqube', () => {
    // Arrange
    const setup = { files: ['build.gradle.kts'], texts: { 'build.gradle.kts': 'id("org.sonarqube")' } };
    // Act
    const res = run(setup);
    // Assert
    assert.equal(res.stack, 'gradle');
    assert.equal(res.scanCommand, undefined);
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
      res.map((r) => [r.stack, r.scanner, r.jdk]),
      markers.map(() => ['cli', 'scanner-cli', null])
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
    assert.equal(res.scanCommand, undefined);
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
    assert.equal(res.scanCommand, undefined);
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
      }
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

  test('lists every stack directory without checking the disk', () => {
    // Arrange
    const setup = { files: ['package.json'] };
    // Act
    const res = run(setup);
    // Assert
    assert.ok(['node_modules', 'vendor', 'dist'].every((n) => res.excluded.includes(n)));
    assert.ok(!res.excluded.includes('docs'));
  });

  test('uses the same static directories for a nested marker', () => {
    // Arrange
    const setup = { files: ['svc/pom.xml'] };
    // Act
    const res = run(setup);
    // Assert
    assert.deepEqual(res.excluded, ['target']);
  });

  test('keeps the static stack patterns when no directory exists', () => {
    // Arrange
    const setup = { files: ['pom.xml'] };
    // Act
    const res = run(setup);
    // Assert
    assert.equal(res.exclusions, '**/.scannerwork/**,**/.git/**,**/target/**');
    assert.deepEqual(res.excluded, ['target']);
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
    assert.equal(res.exclusions, '**/ok/**,**/.scannerwork/**,**/.git/**,**/target/**');
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
    const setup = { files: ['pom.xml', 'build.gradle'] };
    // Act
    const res = run(setup);
    // Assert
    assert.deepEqual(res.excluded, []);
  });
});

describe('detect wrapper', () => {
  test('is true for maven when mvnw and its properties are tracked', () => {
    // Arrange
    const setup = { files: ['pom.xml', 'mvnw', '.mvn/wrapper/maven-wrapper.properties'] };
    // Act
    const res = run(setup);
    // Assert
    assert.equal(res.wrapper, true);
  });

  test('is true for gradle in a nested workdir', () => {
    // Arrange
    const files = ['svc/build.gradle', 'svc/gradlew', 'svc/gradle/wrapper/gradle-wrapper.properties'];
    const setup = { files, texts: { 'svc/build.gradle': SONAR_GRADLE } };
    // Act
    const res = run(setup);
    // Assert
    assert.equal(res.wrapper, true);
  });

  test('is false when the properties file is not tracked', () => {
    // Arrange
    const setup = { files: ['pom.xml', 'mvnw'] };
    // Act
    const res = run(setup);
    // Assert
    assert.equal(res.wrapper, false);
  });

  test('is false for the cli stack', () => {
    // Arrange
    const setup = { files: ['package.json', 'mvnw'] };
    // Act
    const res = run(setup);
    // Assert
    assert.equal(res.wrapper, false);
  });
});

const FILE = path.join('/cache', 'cdk', 'setup-local-sonarqube-tags.json');
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
    assert.ok(
      deps.fetched.some(
        (u) => u === 'https://hub.docker.com/v2/namespaces/library/repositories/maven/tags?page_size=100'
      )
    );
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

  test('reads every page and takes the highest match across them', async () => {
    // Arrange
    const next = 'https://hub.docker.com/v2/namespaces/library/repositories/sonarqube/tags?page=2&page_size=100';
    const pages = new Map([
      ['page_size=100', JSON.stringify({ next, results: [{ name: '25.1.0.1-community' }] })],
      ['page=2', HUB(['25.2.0.1-community'])]
    ]);
    const deps = {
      ...tagDeps(),
      fetchText: async (url) => pages.get(url.includes('page=2') ? 'page=2' : 'page_size=100')
    };
    // Act
    const res = await tags({}, deps);
    // Assert
    assert.equal(res.server, '25.2.0.1-community');
  });

  test('returns after one fetch when a matching page has no next link', async () => {
    // Arrange
    let calls = 0;
    const deps = {
      ...tagDeps(),
      fetchText: async () => {
        calls++;
        return HUB(['25.2.0.1-community']);
      }
    };
    // Act
    const res = await tags({}, deps);
    // Assert
    assert.equal(res.server, '25.2.0.1-community');
    assert.equal(calls, 1);
  });

  test('ignores a next link on a foreign host', async () => {
    // Arrange
    const fetched = [];
    const body = JSON.stringify({ next: 'https://evil.example/v2/x', results: [{ name: 'latest' }] });
    const deps = {
      ...tagDeps(),
      fetchText: async (url) => {
        fetched.push(url);
        return body;
      }
    };
    // Act
    const act = tags({}, deps);
    // Assert
    await assert.rejects(act, /image tag unresolved/);
    assert.equal(fetched.length, 1);
  });

  test('stops after ten pages', async () => {
    // Arrange
    let calls = 0;
    const next = 'https://hub.docker.com/v2/namespaces/library/repositories/sonarqube/tags?page=2';
    const deps = {
      ...tagDeps(),
      fetchText: async () => {
        calls++;
        return JSON.stringify({ next, results: [{ name: 'latest' }] });
      }
    };
    // Act
    const act = tags({}, deps);
    // Assert
    await assert.rejects(act, /image tag unresolved/);
    assert.equal(calls, 10);
  });

  test('treats a non-JSON listing as no match', async () => {
    // Arrange
    const deps = { ...tagDeps(), fetchText: async () => '<html>' };
    // Act
    const act = tags({}, deps);
    // Assert
    await assert.rejects(act, /image tag unresolved/);
  });

  test('returns the server tag only when no stack is given', async () => {
    // Arrange
    const deps = tagDeps({ hub: { sonarqube: SERVER_HUB } });
    // Act
    const res = await tags({}, deps);
    // Assert
    assert.deepEqual(res, {
      server: '25.2.0.1-community',
      scanner: null,
      scannerImage: null,
      source: { server: 'looked-up', scanner: null }
    });
    assert.equal(deps.fetched.length, 1);
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

const SERVER = '25.2.0.1-community';
const base = { name: 'cdk-sonar-app', key: 'app', server: SERVER };
const scannerOf = (stack, scannerImage, scanner) => ({
  ...base,
  stack,
  scannerImage,
  scanner,
  exclusions: '**/target/**,**/.git/**'
});

describe('renderCompose', () => {
  test('renders the pinned server with loopback port, named volumes, and no secret', () => {
    // Arrange
    const input = base;
    // Act
    const yaml = renderCompose(input);
    // Assert
    assert.match(yaml, /^name: cdk-sonar-app\nservices:\n/);
    assert.ok(yaml.includes(`image: sonarqube:${SERVER}`));
    assert.ok(yaml.includes('host_ip: 127.0.0.1'));
    assert.ok(yaml.includes('published: "${SONAR_PORT:-9000}"'));
    for (const v of ['sonarqube-data', 'sonarqube-extensions', 'sonarqube-logs'])
      assert.ok(yaml.includes(`  ${v}: {}`));
    assert.ok(!/latest|password|token/i.test(yaml));
    assert.ok(!yaml.includes('scanner:'));
    assert.ok(!yaml.includes('version:'));
  });

  test('renders a cli scanner service under the scan profile', () => {
    // Arrange
    const input = scannerOf('cli', 'sonarsource/sonar-scanner-cli', '12.0.1.1_7.10.0');
    // Act
    const yaml = renderCompose(input);
    // Assert
    assert.ok(yaml.includes('image: sonarsource/sonar-scanner-cli:12.0.1.1_7.10.0'));
    assert.ok(yaml.includes('      - scan\n'));
    assert.ok(yaml.includes('condition: service_healthy'));
    assert.ok(yaml.includes('      - path: .env.sonar\n        required: false'));
    assert.ok(yaml.includes('- SONAR_HOST_URL=http://sonarqube:9000'));
    assert.ok(!/- SONAR_TOKEN\n/.test(yaml));
    assert.ok(yaml.includes('read_only: true'));
    assert.ok(
      yaml.includes('cd /src && sonar-scanner -Dsonar.working.directory=/tmp/.scannerwork -Dsonar.projectKey=app')
    );
    assert.ok(!yaml.includes('cp -a'));
    assert.ok(yaml.includes('-Dsonar.host.url=\\"$$SONAR_HOST_URL\\"'));
    assert.ok(yaml.includes('$$SONAR_EXCLUSIONS'));
    assert.ok(yaml.includes('"SONAR_EXCLUSIONS=**/target/**,**/.git/**"'));
    assert.ok(!yaml.includes('maven-cache'));
  });

  test('adds a healthcheck on the server status API', () => {
    // Arrange
    const input = base;
    // Act
    const yaml = renderCompose(input);
    // Assert
    assert.ok(yaml.includes('http://localhost:9000/api/system/status'));
    assert.ok(yaml.includes('      retries: 30'));
    assert.ok(yaml.includes('      start_period: 60s'));
  });

  test('copies the repo for maven and gradle and passes the host URL', () => {
    // Arrange
    const inputs = [
      scannerOf('maven', 'maven', '3.9.11-eclipse-temurin-21'),
      scannerOf('gradle', 'gradle', '8.14.3-jdk21')
    ];
    // Act
    const yamls = inputs.map((i) => renderCompose({ ...i, workdir: 'svc' }));
    // Assert
    for (const yaml of yamls) {
      assert.ok(yaml.includes('cp -a /src/. /tmp/work && cd /tmp/work/svc && '));
      assert.ok(yaml.includes('-Dsonar.host.url=\\"$$SONAR_HOST_URL\\"'));
    }
  });

  test('uses the wrapper scripts when wrapper is true', () => {
    // Arrange
    const maven = scannerOf('maven', 'maven', '3.9.11-eclipse-temurin-21');
    const gradle = scannerOf('gradle', 'gradle', '8.14.3-jdk21');
    // Act
    const m = renderCompose({ ...maven, wrapper: true });
    const g = renderCompose({ ...gradle, wrapper: true });
    // Assert
    assert.ok(m.includes('sh ./mvnw -B clean verify'));
    assert.ok(g.includes('sh ./gradlew sonar'));
  });

  test('rejects a non-boolean wrapper', () => {
    // Arrange
    const input = scannerOf('maven', 'maven', '3.9.11-eclipse-temurin-21');
    // Act
    const act = () => renderCompose({ ...input, wrapper: 'yes' });
    // Assert
    assert.throws(act, /wrapper must be a boolean/);
  });

  test('adds the maven command and cache volume', () => {
    // Arrange
    const input = scannerOf('maven', 'maven', '3.9.11-eclipse-temurin-21');
    // Act
    const yaml = renderCompose(input);
    // Assert
    assert.ok(yaml.includes('mvn -B clean verify org.sonarsource.scanner.maven:sonar-maven-plugin:sonar'));
    assert.ok(yaml.includes('target: /root/.m2'));
    assert.ok(yaml.includes('  maven-cache: {}'));
  });

  test('adds the gradle command and cache volume', () => {
    // Arrange
    const input = scannerOf('gradle', 'gradle', '8.14.3-jdk21');
    // Act
    const yaml = renderCompose(input);
    // Assert
    assert.ok(yaml.includes('gradle sonar -Dsonar.projectKey=app'));
    assert.ok(yaml.includes('target: /root/.gradle'));
    assert.ok(yaml.includes('  gradle-cache: {}'));
  });

  test('omits the project name when none is given', () => {
    // Arrange
    const input = { server: SERVER };
    // Act
    const yaml = renderCompose(input);
    // Assert
    assert.ok(yaml.startsWith('services:\n'));
  });

  test('rejects a bad, latest, or missing server tag', () => {
    // Arrange
    const bad = ['latest', 'a b', '1;rm', undefined];
    // Act
    const acts = bad.map((server) => () => renderCompose({ ...base, server }));
    // Assert
    for (const act of acts) assert.throws(act, /server tag/);
  });

  test('rejects a bad scanner tag or image', () => {
    // Arrange
    const input = scannerOf('maven', 'maven', '3.9.11');
    // Act
    const tag = () => renderCompose({ ...input, scanner: 'latest' });
    const image = () => renderCompose({ ...input, scannerImage: 'Bad Image' });
    // Assert
    assert.throws(tag, /scanner tag/);
    assert.throws(image, /scanner image/);
  });

  test('rejects a stack without a key or with an unsafe one', () => {
    // Arrange
    const input = scannerOf('cli', 'sonarsource/sonar-scanner-cli', '12.0.1.1_7.10.0');
    // Act
    const missing = () => renderCompose({ ...input, key: undefined });
    const unsafe = () => renderCompose({ ...input, key: 'a;b' });
    // Assert
    assert.throws(missing, /key/);
    assert.throws(unsafe, /key/);
  });

  test('rejects an unsafe workdir', () => {
    // Arrange
    const input = scannerOf('cli', 'sonarsource/sonar-scanner-cli', '12.0.1.1_7.10.0');
    // Act
    const act = () => renderCompose({ ...input, workdir: '../x' });
    // Assert
    assert.throws(act, /workdir/);
  });

  test('rejects unknown stacks and unsafe exclusions', () => {
    // Arrange
    const input = scannerOf('cli', 'sonarsource/sonar-scanner-cli', '12.0.1.1_7.10.0');
    // Act
    const stack = () => renderCompose({ ...input, stack: 'dotnet' });
    const excl = () => renderCompose({ ...input, exclusions: 'a$(x)' });
    // Assert
    assert.throws(stack, /stack must be/);
    assert.throws(excl, /exclusions/);
  });
});

const TASKS_FILE_PATH = path.join(ROOT, '.vscode', 'tasks.json');
const COMPOSE_PATH = path.join(ROOT, 'compose.sonar.yaml');
const CACHE = JSON.stringify({
  server: entry('25.2.0.1-community'),
  'scanner-cli': entry('12.0.1.1_7.10.0'),
  'maven-21': entry('3.9.11-eclipse-temurin-21')
});

// Stub deps for `compose`: a fake repo, the tag cache, and an in-memory file store keyed by absolute path.
const composeDeps = ({ setup = { files: ['package.json'] }, existing = {}, realpath, symlinks = [] } = {}) => {
  const tagStub = tagDeps({ cache: CACHE });
  const files = new Map(Object.entries(existing));
  const repoStub = repo(setup);
  return {
    ...tagStub,
    ...repoStub,
    files,
    readText: (p) => files.get(p) ?? tagStub.readText(p) ?? repoStub.readText(p),
    existsSync: (p) => files.has(p),
    realpath: realpath ?? ((p) => p),
    isSymlink: (p) => symlinks.includes(p),
    writeText: (p, text) => {
      files.set(p, text);
    }
  };
};

describe('renderTasks', () => {
  const labels = (t) => t.tasks.map((x) => x.label);

  test('builds three tasks with no token input from nothing', () => {
    // Arrange
    const existing = null;
    // Act
    const res = renderTasks(existing, { scanner: true });
    // Assert
    assert.equal(res.version, '2.0.0');
    assert.deepEqual(labels(res), ['sonar: start', 'sonar: stop', 'sonar: scan']);
    assert.deepEqual(res.tasks[0].args, ['compose', '-f', 'compose.sonar.yaml', 'up', '-d', '--wait', 'sonarqube']);
    assert.deepEqual(res.tasks[2].args.slice(-3), ['run', '--rm', 'scanner']);
    assert.equal(res.tasks[2].options, undefined);
    assert.equal(res.inputs, undefined);
  });

  test('keeps unrelated tasks, inputs, and version, and replaces a same-label task', () => {
    // Arrange
    const existing = {
      version: '2.0.0',
      tasks: [{ label: 'build' }, { label: 'sonar: start', command: 'old' }],
      inputs: [{ id: 'other', type: 'promptString' }]
    };
    // Act
    const res = renderTasks(existing, { scanner: true });
    // Assert
    assert.deepEqual(labels(res), ['build', 'sonar: start', 'sonar: stop', 'sonar: scan']);
    assert.equal(res.tasks[1].command, 'docker');
    assert.deepEqual(
      res.inputs.map((i) => i.id),
      ['other']
    );
    assert.equal(existing.tasks.length, 2);
  });

  test('drops a stale scan task and its input for a server-only run', () => {
    // Arrange
    const first = renderTasks(
      { tasks: [{ label: 'build' }], inputs: [{ id: 'sonarToken', type: 'promptString' }] },
      { scanner: true }
    );
    // Act
    const res = renderTasks(first, { scanner: false });
    // Assert
    assert.deepEqual(labels(res), ['build', 'sonar: start', 'sonar: stop']);
    assert.equal(res.inputs, undefined);
  });

  test('rejects non-object input and non-array tasks', () => {
    // Arrange
    const cases = [[], 'x', 3, { tasks: {} }, { inputs: 'x' }];
    // Act
    const acts = cases.map((c) => () => renderTasks(c, {}));
    // Assert
    for (const act of acts) assert.throws(act);
  });
});

describe('compose', () => {
  test('writes the compose file and tasks for a detected stack', async () => {
    // Arrange
    const deps = composeDeps();
    // Act
    const res = await compose({ root: ROOT }, deps);
    // Assert
    assert.equal(res.path, COMPOSE_PATH);
    assert.deepEqual(res.services, ['sonarqube', 'scanner']);
    assert.equal(res.server, 'sonarqube:25.2.0.1-community');
    assert.equal(res.scanner, 'sonarsource/sonar-scanner-cli:12.0.1.1_7.10.0');
    assert.equal(res.stop, undefined);
    assert.ok(
      deps.files
        .get(COMPOSE_PATH)
        .includes('sonar-scanner -Dsonar.working.directory=/tmp/.scannerwork -Dsonar.projectKey=repo')
    );
    assert.deepEqual(res.taskLabels, ['sonar: start', 'sonar: stop', 'sonar: scan']);
    assert.equal(res.tasks, TASKS_FILE_PATH);
    assert.ok(deps.files.get(TASKS_FILE_PATH).endsWith('}\n'));
  });

  test('overwrites an existing file with force', async () => {
    // Arrange
    const deps = composeDeps({ existing: { [COMPOSE_PATH]: 'old' } });
    // Act
    const res = await compose({ root: ROOT, force: true }, deps);
    // Assert
    assert.equal(res.path, COMPOSE_PATH);
    assert.notEqual(deps.files.get(COMPOSE_PATH), 'old');
  });

  test('writes a server-only file and reports the stack stop for an unsupported stack', async () => {
    // Arrange
    const deps = composeDeps({ setup: { files: ['App.sln'] } });
    // Act
    const res = await compose({ root: ROOT }, deps);
    // Assert
    assert.match(res.stop, /\.NET/);
    assert.deepEqual(res.services, ['sonarqube']);
    assert.equal(res.scanner, null);
    assert.ok(!deps.files.get(COMPOSE_PATH).includes('scanner:'));
    assert.deepEqual(res.taskLabels, ['sonar: start', 'sonar: stop']);
  });

  test('refuses an existing file without force and writes nothing', async () => {
    // Arrange
    const deps = composeDeps({ existing: { [COMPOSE_PATH]: 'old' } });
    // Act
    const res = await compose({ root: ROOT }, deps);
    // Assert
    assert.equal(res.stop, 'compose.sonar.yaml exists');
    assert.equal(res.path, null);
    assert.equal(deps.files.get(COMPOSE_PATH), 'old');
    assert.equal(deps.files.has(TASKS_FILE_PATH), false);
  });

  test('returns the ask before writing', async () => {
    // Arrange
    const deps = composeDeps({
      setup: { files: ['pom.xml', 'build.gradle'], texts: { 'build.gradle': SONAR_GRADLE } }
    });
    // Act
    const res = await compose({ root: ROOT }, deps);
    // Assert
    assert.deepEqual(res.ask, ['maven', 'gradle']);
    assert.equal(deps.files.has(COMPOSE_PATH), false);
  });

  test('throws when a target resolves outside the root', async () => {
    // Arrange
    const deps = composeDeps({ realpath: (p) => (p.includes('.vscode') ? '/elsewhere/.vscode' : p) });
    // Act
    const act = compose({ root: ROOT }, deps);
    // Assert
    await assert.rejects(act, /outside the repo root/);
    assert.equal(deps.files.has(COMPOSE_PATH), false);
  });

  test('throws on a symlink target before writing anything', async () => {
    // Arrange
    const deps = composeDeps({ symlinks: [COMPOSE_PATH] });
    // Act
    const act = compose({ root: ROOT }, deps);
    // Assert
    await assert.rejects(act, /symlink/);
    assert.equal(deps.files.has(COMPOSE_PATH), false);
  });

  test('writes nothing when the tasks file has an invalid shape', async () => {
    // Arrange
    const deps = composeDeps({ existing: { [TASKS_FILE_PATH]: '[]' } });
    // Act
    const act = compose({ root: ROOT }, deps);
    // Assert
    await assert.rejects(act, /JSON object/);
    assert.equal(deps.files.has(COMPOSE_PATH), false);
  });

  test('runs the scanner in the nested build directory', async () => {
    // Arrange
    const deps = composeDeps({ setup: { files: ['app/pom.xml'] } });
    // Act
    await compose({ root: ROOT }, deps);
    // Assert
    assert.ok(deps.files.get(COMPOSE_PATH).includes('cd /tmp/work/app && mvn'));
  });

  test('merges plain JSON tasks and keeps unrelated ones', async () => {
    // Arrange
    const existing = { [TASKS_FILE_PATH]: JSON.stringify({ version: '2.0.0', tasks: [{ label: 'build' }] }) };
    const deps = composeDeps({ existing });
    // Act
    const res = await compose({ root: ROOT }, deps);
    // Assert
    assert.equal(res.tasks, TASKS_FILE_PATH);
    assert.equal(JSON.parse(deps.files.get(TASKS_FILE_PATH)).tasks[0].label, 'build');
  });

  test('leaves a JSONC tasks file untouched and reports tasksStop', async () => {
    // Arrange
    const jsonc = '{ // c\n "tasks": [] }';
    const deps = composeDeps({ existing: { [TASKS_FILE_PATH]: jsonc } });
    // Act
    const res = await compose({ root: ROOT }, deps);
    // Assert
    assert.equal(res.tasksStop, '.vscode/tasks.json is not plain JSON');
    assert.equal(res.tasks, null);
    assert.equal(deps.files.get(TASKS_FILE_PATH), jsonc);
    assert.ok(deps.files.has(COMPOSE_PATH));
  });

  test('requires a root', async () => {
    // Arrange
    const deps = composeDeps();
    // Act
    const act = compose({}, deps);
    // Assert
    await assert.rejects(act, /--root is required/);
  });
});

describe('main compose', () => {
  test('prints the compose result JSON and passes --force', async () => {
    // Arrange
    const out = [];
    const deps = { ...composeDeps({ existing: { [COMPOSE_PATH]: 'old' } }), log: (t) => out.push(t), error: () => {} };
    // Act
    const code = await main(['compose', '--root', ROOT, '--force'], deps);
    // Assert
    assert.equal(code, 0);
    assert.equal(JSON.parse(out[0]).path, COMPOSE_PATH);
  });

  test('usage lists the compose subcommand', async () => {
    // Arrange
    const err = [];
    // Act
    await main([], { error: (t) => err.push(t) });
    // Assert
    assert.match(err[0], /compose --root <dir>/);
  });
});

const ENV_PATH = path.join(ROOT, '.env.sonar');
const IGNORE_PATH = path.join(ROOT, '.gitignore');
const SECRET = 'squ_topsecret';
const reply = (status, body = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
  text: async () => JSON.stringify(body)
});

// Stub deps for `configure`: a fake SonarQube server behind `fetch` plus in-memory files, modes, and git.
const configureDeps = ({
  server = {},
  setup = { files: ['package.json'] },
  existing = {},
  ignored = false,
  symlinks = [],
  docker = '127.0.0.1:9000\n'
} = {}) => {
  const state = {
    status: 'UP',
    admin: 'admin',
    projects: [],
    tokens: [],
    failGenerate: false,
    offline: false,
    ...server
  };
  const files = new Map(Object.entries(existing));
  const modes = new Map();
  const calls = [];
  const sleeps = [];
  const dockerCalls = [];
  const repoStub = repo(setup);
  return {
    state,
    files,
    modes,
    calls,
    sleeps,
    docker: (args) => {
      dockerCalls.push(args);
      if (docker instanceof Error) throw docker;
      return docker;
    },
    dockerCalls,
    git: (args, cwd) => {
      if (args[0] === 'check-ignore') {
        if (ignored) return '';
        throw Object.assign(new Error('not ignored'), { status: 1 });
      }
      return repoStub.git(args, cwd);
    },
    readText: (p) => files.get(p) ?? repoStub.readText(p),
    writeText: (p, text, mode) => {
      files.set(p, text);
      if (mode !== undefined) modes.set(p, mode);
    },
    realpath: (p) => p,
    isSymlink: (p) => symlinks.includes(p),
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    randomBytes: (n) => Buffer.from(Array.from({ length: n }, (_, i) => (i * 37 + 11) % 256)),
    fetch: async (url, init) => {
      const u = new URL(url);
      const endpoint = u.pathname.slice(1);
      const form = new URLSearchParams(init.body ?? '');
      const login = Buffer.from((init.headers.Authorization ?? '').replace('Basic ', ''), 'base64').toString();
      calls.push({ endpoint, host: u.host, method: init.method, form: Object.fromEntries(form) });
      if (state.offline) throw new TypeError('fetch failed');
      if (endpoint === 'api/system/status') return reply(200, { status: state.status });
      if (endpoint === 'api/authentication/validate') return reply(200, { valid: login === `admin:${state.admin}` });
      if (endpoint === 'api/users/change_password') {
        if (form.get('previousPassword') !== state.admin) return reply(400);
        state.admin = form.get('password');
        return reply(204);
      }
      if (login !== `admin:${state.admin}`) return reply(401);
      if (endpoint === 'api/projects/search') {
        const key = u.searchParams.get('projects');
        return reply(200, { components: state.projects.includes(key) ? [{ key }] : [] });
      }
      if (endpoint === 'api/projects/create') {
        state.projects.push(form.get('project'));
        return reply(200, { project: { key: form.get('project') } });
      }
      if (endpoint === 'api/user_tokens/search')
        return reply(200, { userTokens: state.tokens.map((name) => ({ name })) });
      if (endpoint === 'api/user_tokens/revoke') {
        state.tokens = state.tokens.filter((t) => t !== form.get('name'));
        return state.revokeStatus ? reply(state.revokeStatus) : reply(204);
      }
      if (endpoint === 'api/user_tokens/generate') {
        if (state.failGenerate) return reply(500, { echo: SECRET });
        state.tokens.push(form.get('name'));
        return reply(200, { token: SECRET });
      }
      return reply(404);
    }
  };
};

describe('configure', () => {
  test('sets the admin password, creates the project, and writes a project token on a fresh server', async () => {
    // Arrange
    const deps = configureDeps();
    // Act
    const res = await configure({ root: ROOT }, deps);
    // Assert
    assert.equal(res.password, 'set');
    assert.equal(res.project, 'created');
    assert.equal(res.token, 'created');
    assert.equal(res.tokenType, 'PROJECT_ANALYSIS_TOKEN');
    assert.equal(res.gitignore, 'added');
    assert.equal(res.env, ENV_PATH);
    assert.equal(deps.modes.get(ENV_PATH), 0o600);
    const env = deps.files.get(ENV_PATH);
    assert.ok(env.includes(`SONAR_TOKEN=${SECRET}\n`));
    assert.ok(env.includes('SONAR_HOST_URL=http://localhost:9000\n'));
    assert.ok(!env.includes('SONAR_PORT'));
    assert.deepEqual(deps.dockerCalls[0], ['compose', '-f', 'compose.sonar.yaml', 'port', 'sonarqube', '9000']);
    assert.equal(deps.files.get(IGNORE_PATH), '.env.sonar\n');
    const generate = deps.calls.find((c) => c.endpoint === 'api/user_tokens/generate');
    assert.equal(generate.form.projectKey, 'repo');
    assert.ok(!JSON.stringify(res).includes(SECRET));
  });

  test('generates a password that meets the complexity rule and keeps it out of the result', async () => {
    // Arrange
    const deps = configureDeps();
    // Act
    const res = await configure({ root: ROOT }, deps);
    // Assert
    const password = /SONAR_ADMIN_PASSWORD=(\S+)/.exec(deps.files.get(ENV_PATH))[1];
    assert.equal(password.length, 24);
    assert.match(password, /[A-Z]/);
    assert.match(password, /[a-z]/);
    assert.match(password, /\d/);
    assert.match(password, /[-_.+@]/);
    assert.ok(!JSON.stringify(res).includes(password));
    assert.equal(deps.state.admin, password);
  });

  test('reuses the file password, keeps unknown keys, and rotates the token on a rerun', async () => {
    // Arrange
    const existing = { [ENV_PATH]: 'SONAR_ADMIN_PASSWORD=Known-Pass-1234\nCUSTOM=1\nSONAR_PORT=9100\n' };
    const deps = configureDeps({
      existing,
      docker: '0.0.0.0:9123\n',
      ignored: true,
      server: { admin: 'Known-Pass-1234', projects: ['repo'], tokens: ['cdk-setup-local-sonarqube'] }
    });
    // Act
    const res = await configure({ root: ROOT }, deps);
    // Assert
    assert.equal(res.password, 'reused');
    assert.equal(res.project, 'exists');
    assert.equal(res.token, 'rotated');
    assert.equal(res.gitignore, 'present');
    assert.ok(deps.files.get(ENV_PATH).includes('CUSTOM=1\n'));
    assert.ok(deps.calls.every((c) => c.host === '127.0.0.1:9123'));
    assert.equal(res.url, 'http://localhost:9123');
    assert.ok(deps.files.get(ENV_PATH).includes('SONAR_PORT=9100\n'));
    assert.ok(!deps.calls.some((c) => c.endpoint === 'api/users/change_password'));
    assert.equal(deps.files.has(IGNORE_PATH), false);
  });

  test('writes a global token for a server-only repo and appends to an existing .gitignore', async () => {
    // Arrange
    const deps = configureDeps({ setup: { files: ['App.sln'] }, existing: { [IGNORE_PATH]: 'node_modules' } });
    // Act
    const res = await configure({ root: ROOT }, deps);
    // Assert
    assert.equal(res.project, null);
    assert.equal(res.tokenType, 'GLOBAL_ANALYSIS_TOKEN');
    assert.ok(!deps.calls.some((c) => c.endpoint.startsWith('api/projects')));
    assert.equal(deps.files.get(IGNORE_PATH), 'node_modules\n.env.sonar\n');
  });

  test('waits through a starting server before it configures', async () => {
    // Arrange
    const deps = configureDeps({ server: { status: 'STARTING' }, docker: '[::]:9050\n' });
    const original = deps.fetch;
    let polls = 0;
    deps.fetch = async (url, init) => {
      if (url.endsWith('api/system/status') && ++polls === 3) deps.state.status = 'UP';
      return original(url, init);
    };
    // Act
    const res = await configure({ root: ROOT }, deps);
    // Assert
    assert.equal(res.token, 'created');
    assert.deepEqual(deps.sleeps, [5000, 5000]);
    assert.equal(res.url, 'http://localhost:9050');
  });

  test('stops when admin/admin is rejected and no password file exists', async () => {
    // Arrange
    const deps = configureDeps({ server: { admin: 'Changed-By-Hand-1' } });
    // Act
    const res = await configure({ root: ROOT }, deps);
    // Assert
    assert.equal(res.stop, 'admin password unknown');
    assert.equal(res.env, null);
    assert.equal(deps.files.has(ENV_PATH), false);
    assert.ok(!deps.calls.some((c) => c.endpoint === 'api/user_tokens/generate'));
  });

  test('stops when the server never reports UP', async () => {
    // Arrange
    const deps = configureDeps({ server: { status: 'STARTING' } });
    // Act
    const res = await configure({ root: ROOT }, deps);
    // Assert
    assert.equal(res.stop, 'server not UP (STARTING)');
    assert.equal(deps.sleeps.length, 29);
    assert.equal(deps.files.has(ENV_PATH), false);
  });

  test('stops with unreachable when the connection fails', async () => {
    // Arrange
    const deps = configureDeps({ server: { offline: true } });
    // Act
    const res = await configure({ root: ROOT }, deps);
    // Assert
    assert.equal(res.stop, 'server not UP (unreachable)');
  });

  test('throws without the response body when token generation fails', async () => {
    // Arrange
    const deps = configureDeps({ server: { failGenerate: true } });
    // Act
    const act = configure({ root: ROOT }, deps);
    // Assert
    await assert.rejects(act, (err) => {
      assert.match(err.message, /^api\/user_tokens\/generate failed \(500\)$/);
      return true;
    });
    assert.ok(!deps.files.get(ENV_PATH).includes('SONAR_TOKEN'));
  });

  test('tolerates a 404 on revoke but throws on any other revoke failure', async () => {
    // Arrange
    const missing = configureDeps({ server: { revokeStatus: 404 } });
    const broken = configureDeps({ server: { revokeStatus: 500 } });
    // Act
    const ok = await configure({ root: ROOT }, missing);
    const act = configure({ root: ROOT }, broken);
    // Assert
    assert.equal(ok.token, 'created');
    await assert.rejects(act, /api\/user_tokens\/revoke failed \(500\)/);
  });

  test('keeps the new admin password on disk and ignored when a later call fails', async () => {
    // Arrange
    const deps = configureDeps({ server: { failGenerate: true } });
    // Act
    const act = configure({ root: ROOT }, deps);
    // Assert
    await assert.rejects(act, /generate failed/);
    const password = /SONAR_ADMIN_PASSWORD=(\S+)/.exec(deps.files.get(ENV_PATH))[1];
    assert.equal(deps.state.admin, password);
    assert.equal(deps.modes.get(ENV_PATH), 0o600);
    assert.equal(deps.files.get(IGNORE_PATH), '.env.sonar\n');
  });

  test('writes nothing when the ignore check itself fails', async () => {
    // Arrange
    const deps = configureDeps();
    const git = deps.git;
    deps.git = (args, cwd) => {
      if (args[0] === 'check-ignore') throw Object.assign(new Error('boom'), { status: 128 });
      return git(args, cwd);
    };
    // Act
    const act = configure({ root: ROOT }, deps);
    // Assert
    await assert.rejects(act, /boom/);
    assert.equal(deps.files.has(ENV_PATH), false);
  });

  test('throws when .env.sonar is a symlink', async () => {
    // Arrange
    const deps = configureDeps({ symlinks: [ENV_PATH] });
    // Act
    const act = configure({ root: ROOT }, deps);
    // Assert
    await assert.rejects(act, /symlink or resolves outside/);
    assert.deepEqual(deps.calls, []);
  });

  test('rejects a missing root', async () => {
    // Arrange
    const deps = configureDeps();
    // Act
    const act = configure({}, deps);
    // Assert
    await assert.rejects(act, /--root is required/);
    assert.deepEqual(deps.calls, []);
  });

  test('rejects when Docker cannot report the port', async () => {
    // Arrange
    const deps = configureDeps({ docker: new Error('no such service') });
    // Act
    const act = configure({ root: ROOT }, deps);
    // Assert
    await assert.rejects(act, /no such service/);
    assert.deepEqual(deps.calls, []);
  });

  test('rejects unparseable or out-of-range published ports', async () => {
    // Arrange
    const outputs = ['', 'foo', '127.0.0.1:0', '127.0.0.1:70000'];
    // Act
    const results = outputs.map((docker) => configure({ root: ROOT }, configureDeps({ docker })));
    // Assert
    for (const act of results) await assert.rejects(act, /sonarqube port not published/);
  });
});

describe('main configure', () => {
  test('passes --root only and prints the result JSON', async () => {
    // Arrange
    const out = [];
    const deps = {
      ...configureDeps({ server: { offline: true }, docker: '127.0.0.1:8080\n' }),
      log: (t) => out.push(t),
      error: () => {}
    };
    // Act
    const code = await main(['configure', '--root', ROOT], deps);
    // Assert
    assert.equal(code, 0);
    assert.equal(JSON.parse(out[0]).url, 'http://localhost:8080');
    assert.equal(deps.calls[0].host, '127.0.0.1:8080');
  });

  test('usage lists the configure subcommand', async () => {
    // Arrange
    const err = [];
    // Act
    await main([], { error: (t) => err.push(t) });
    // Assert
    assert.match(err[0], /configure --root <dir>/);
  });
});
