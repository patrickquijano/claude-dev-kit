// Lists a plugin's components in full (no cap) as `name — path — description` lines, so the README analyst never truncates them.
// CLI: `components.mjs <absolute root>` prints `Skills (n):`, `Agents (n):`, `Hooks (n):` sections, or `Components: none (not a plugin)`. Exit 0 = ok, 1 = read failed, 2 = bad arguments.
import { readdirSync, readFileSync, realpathSync } from 'node:fs';
import { basename } from 'node:path';
import { pathToFileURL } from 'node:url';

// Runs `fn` only when this module is the entry script; an error it throws prints one stderr line and sets exit code 1.
async function runIfMain(metaUrl, fn, label) {
  if (!process.argv[1] || metaUrl !== pathToFileURL(realpathSync(process.argv[1])).href) return;
  try {
    const code = await fn();
    if (typeof code === 'number') process.exitCode = code;
  } catch (err) {
    process.stderr.write(
      `${label}: ${String(err?.message ?? err)
        .split('\n')[0]
        .slice(0, 300)}\n`
    );
    process.exitCode = 1;
  }
}

const PATH_OK = /^[A-Za-z0-9._/-]+$/;

// True for an absolute path of safe characters with no `..` segment.
export function isSafePath(path) {
  return path.startsWith('/') && PATH_OK.test(path) && !path.split('/').includes('..');
}

// Reads one frontmatter field; a `>` or `|` block scalar joins its indented lines; absent → ''.
export function frontmatterField(text, key) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/.exec(String(text ?? ''));
  if (!m) return '';
  const rows = m[1].split(/\r?\n/);
  const at = rows.findIndex((l) => l.startsWith(`${key}:`));
  if (at < 0) return '';
  const value = rows[at].slice(key.length + 1).trim();
  if (/^[>|]/.test(value)) {
    const block = [];
    for (let i = at + 1; i < rows.length && /^([ \t]|\s*$)/.test(rows[i]); i++) block.push(rows[i].trim());
    return block.filter(Boolean).join(' ');
  }
  return value.replace(/^(["'])(.*)\1$/, '$2');
}

// One `name — path — description` line per hook event in hooks.json text; each entry names its matcher and script.
export function hookLines(json) {
  const hooks = JSON.parse(json)?.hooks;
  if (hooks === null || typeof hooks !== 'object') throw new Error('hooks.json has no hooks object');
  return Object.entries(hooks).map(([event, entries]) => {
    const scripts = [];
    for (const entry of Array.isArray(entries) ? entries : []) {
      for (const h of Array.isArray(entry?.hooks) ? entry.hooks : []) {
        const cmd = [h?.command, ...(Array.isArray(h?.args) ? h.args : [])].join(' ');
        const file = /([A-Za-z0-9._-]+\.mjs)/.exec(cmd)?.[1] ?? cmd.trim();
        scripts.push(entry.matcher ? `${file} (matcher ${entry.matcher})` : file);
      }
    }
    return `${event} — hooks/hooks.json — runs ${scripts.join(', ') || 'no command'}`;
  });
}

const realDeps = {
  readFile: (path) => readFileSync(path, 'utf8'),
  listDir: (path) => {
    try {
      return readdirSync(path, { withFileTypes: true }).map((e) => ({ name: e.name, dir: e.isDirectory() }));
    } catch (err) {
      if (err?.code === 'ENOENT') return [];
      throw err;
    }
  },
  exists: (path) => {
    try {
      readFileSync(path);
      return true;
    } catch (err) {
      if (err?.code === 'ENOENT') return false;
      throw err;
    }
  },
  log: (text) => console.log(text),
  error: (text) => console.error(text)
};

function describe(d, root, rel, name) {
  const text = d.readFile(`${root}/${rel}`);
  const description = frontmatterField(text, 'description');
  return `${frontmatterField(text, 'name') || name} — ${rel} — ${description || 'no description'}`;
}

// Returns the report text for a plugin root, or null when the root is not a plugin.
export function collect(root, d) {
  if (!d.exists(`${root}/.claude-plugin/plugin.json`)) return null;
  const skills = d
    .listDir(`${root}/skills`)
    .filter((e) => e.dir && d.exists(`${root}/skills/${e.name}/SKILL.md`))
    .map((e) => describe(d, root, `skills/${e.name}/SKILL.md`, e.name))
    .sort();
  const agents = d
    .listDir(`${root}/agents`)
    .filter((e) => !e.dir && e.name.endsWith('.md'))
    .map((e) => describe(d, root, `agents/${e.name}`, basename(e.name, '.md')))
    .sort();
  const hooks = d.exists(`${root}/hooks/hooks.json`) ? hookLines(d.readFile(`${root}/hooks/hooks.json`)) : [];
  const section = (title, lines) => `${title} (${lines.length}):\n${lines.join('\n')}`;
  return [section('Skills', skills), section('Agents', agents), section('Hooks', hooks)].join('\n');
}

// CLI body; returns the exit code.
export function main(argv, deps = {}) {
  const d = { ...realDeps, ...deps };
  if (argv.length !== 1 || !isSafePath(argv[0])) {
    d.error('usage: components.mjs <absolute root matching ^[A-Za-z0-9._/-]+$ with no .. segment>');
    return 2;
  }
  d.log(collect(argv[0].replace(/\/$/, ''), d) ?? 'Components: none (not a plugin)');
  return 0;
}

await runIfMain(import.meta.url, () => main(process.argv.slice(2)), 'components');
