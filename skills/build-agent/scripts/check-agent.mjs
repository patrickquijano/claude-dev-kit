// Mechanical checks for one subagent file (frontmatter, body structure, scope-ignored fields); prints JSON.
// Self-contained on purpose: plugin installs have no node_modules, and no skill may import another skill's files.
import { readFileSync } from 'node:fs';
import { basename } from 'node:path';
import { pathToFileURL } from 'node:url';

// Real side effects; tests pass stubs.
const defaults = {
  read: (path) => readFileSync(path, 'utf8'),
  log: (line) => console.log(line),
  error: (line) => console.error(line)
};

const USAGE = 'usage: check-agent.mjs <agent-file> [--scope personal|project|plugin]';
const SCOPES = ['personal', 'project', 'plugin'];
// Copied from the Fields table in references/frontmatter.md.
const KNOWN_FIELDS = new Set([
  'name',
  'description',
  'tools',
  'disallowedTools',
  'model',
  'permissionMode',
  'maxTurns',
  'skills',
  'mcpServers',
  'hooks',
  'memory',
  'background',
  'omitClaudeMd',
  'effort',
  'isolation',
  'color',
  'initialPrompt',
  'experimental',
  'autoCompactWindow'
]);
const ENUMS = {
  permissionMode: ['default', 'acceptEdits', 'auto', 'dontAsk', 'bypassPermissions', 'plan'],
  effort: ['low', 'medium', 'high', 'xhigh', 'max'],
  isolation: ['worktree'],
  memory: ['user', 'project', 'local'],
  color: ['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan']
};
const MODEL_ALIASES = ['sonnet', 'opus', 'haiku', 'fable', 'inherit'];
const BOOLEANS = ['background', 'omitClaudeMd'];
const PLUGIN_IGNORED = ['permissionMode', 'hooks', 'mcpServers', 'initialPrompt'];
const REMOVED_TOOLS = [
  'AskUserQuestion',
  'EnterPlanMode',
  'ExitPlanMode',
  'ScheduleWakeup',
  'WaitForMcpServers',
  'Workflow'
];

export class FrontmatterError extends Error {}

const error = (id, rubric, line, message) => ({ level: 'error', id, rubric, line, message });
const warning = (id, rubric, line, message) => ({ level: 'warning', id, rubric, line, message });

// Strips surrounding quotes from a scalar.
function unquote(value) {
  const v = value.trim();
  const quoted = v.length >= 2 && (v[0] === '"' || v[0] === "'") && v[v.length - 1] === v[0];
  return quoted ? v.slice(1, -1) : v;
}

// Parses the frontmatter subset check-agent needs: top-level `key: value`, quoted strings, `- item` block lists, and
// indented continuation or nested lines. Returns the fields, each key's 1-based line, and the closing `---` line.
export function parseFrontmatter(text) {
  const lines = text.split('\n');
  if (lines[0].trimEnd() !== '---') throw new FrontmatterError('missing opening --- on line 1');
  const end = lines.findIndex((line, i) => i > 0 && line.trimEnd() === '---');
  if (end === -1) throw new FrontmatterError('missing closing ---');
  const fields = {};
  const lineOf = {};
  let key = null;
  for (let i = 1; i < end; i += 1) {
    const line = lines[i];
    if (line.trim() === '' || /^\s*#/.test(line)) continue;
    const top = /^([A-Za-z_][\w-]*):(.*)$/.exec(line);
    if (top) {
      key = top[1];
      lineOf[key] = i + 1;
      const raw = top[2].trim();
      const value = /^["']/.test(raw) ? raw : raw.replace(/\s+#.*$/, '');
      fields[key] = /^[>|][+-]?$/.test(value) ? '' : unquote(value);
    } else if (key && /^\s+-\s/.test(line)) {
      if (!Array.isArray(fields[key])) fields[key] = [];
      fields[key].push(unquote(line.replace(/^\s+-\s+/, '')));
    } else if (key && /^\s+\S/.test(line)) {
      if (typeof fields[key] === 'string') fields[key] = `${fields[key]} ${line.trim()}`.trim();
    } else {
      throw new FrontmatterError(`line ${i + 1} is not valid frontmatter YAML`);
    }
  }
  return { fields, lineOf, endLine: end + 1 };
}

const items = (value) =>
  (Array.isArray(value) ? value : String(value ?? '').split(','))
    .map((item) => item.trim())
    .filter((item) => item !== '');
// A plugin-qualified skill or agent name, or a spawned-by phrase; bare names stay a rubric judgment.
const REFERENCE = /\b[a-z0-9-]+:[a-z0-9]+-[a-z0-9-]+\b|\bspawned by\b/i;

const toolName = (entry) => entry.replace(/\(.*$/, '').trim();

// A1, A2, A3, A7 on the parsed fields; `lineOf` maps a field to its line; `stem` is the file name without `.md`.
export function checkFrontmatter(fields, stem, lineOf = {}, scope) {
  const found = [];
  const at = (key) => lineOf[key] ?? 1;
  for (const key of Object.keys(fields)) {
    if (!KNOWN_FIELDS.has(key)) found.push(error('unknown-field', 'A1', at(key), `unknown frontmatter field "${key}"`));
  }
  const name = String(fields.name ?? '');
  if (!name) {
    found.push(error('name-missing', 'A2', 1, 'name is missing'));
  } else {
    const line = at('name');
    if (name.includes(':')) found.push(error('name-colon', 'A2', line, 'name must not contain ":"'));
    if (name.startsWith('-')) found.push(error('name-hyphen', 'A2', line, 'name must not start with "-"'));
    if (name.length > 256) found.push(error('name-length', 'A2', line, `name is ${name.length} chars, max 256`));
    if (name !== stem) {
      found.push(warning('name-stem', 'A2', line, `name "${name}" differs from the file name "${stem}"`));
    }
  }
  const description = String(fields.description ?? '').trim();
  if (!description) {
    found.push(error('description-missing', 'A3', 1, 'description is missing or empty'));
  } else {
    const line = at('description');
    if (description.length > 200)
      found.push(error('description-length', 'A3', line, `description is ${description.length} chars, max 200`));
    if (!/use proactively/i.test(description))
      found.push(error('description-proactive', 'A3', line, 'description must contain "Use proactively"'));
    if (REFERENCE.test(description))
      found.push(error('description-reference', 'A3', line, 'description names a skill, subagent, or spawner'));
  }
  for (const [key, values] of Object.entries(ENUMS)) {
    if (key in fields && !values.includes(fields[key])) {
      found.push(error('enum-value', 'A7', at(key), `${key} "${fields[key]}" must be one of ${values.join(', ')}`));
    }
  }
  if ('model' in fields) {
    const model = String(fields.model);
    if (!MODEL_ALIASES.includes(model) && !/^[\w.:-]+$/.test(model)) {
      found.push(error('enum-value', 'A7', at('model'), `model "${model}" must be an alias or a full model id`));
    }
  }
  for (const key of BOOLEANS) {
    if (key in fields && !['true', 'false'].includes(fields[key])) {
      found.push(error('boolean-value', 'A7', at(key), `${key} must be true or false`));
    }
  }
  if ('maxTurns' in fields && !/^[1-9]\d*$/.test(String(fields.maxTurns))) {
    found.push(error('max-turns', 'A7', at('maxTurns'), 'maxTurns must be a positive integer'));
  }
  if ('skills' in fields && items(fields.skills).length > 32) {
    found.push(error('skills-count', 'A7', at('skills'), 'skills lists more than 32 entries'));
  }
  if (scope === 'plugin') {
    for (const key of PLUGIN_IGNORED.filter((k) => k in fields)) {
      found.push(error('scope-ignored', 'A7', at(key), `plugin agents ignore ${key}; use a personal or project agent`));
    }
  }
  const tools = items(fields.tools).map(toolName);
  for (const tool of tools.filter((t) => REMOVED_TOOLS.includes(t))) {
    found.push(warning('removed-tool', 'A7', at('tools'), `${tool} is always removed from subagents`));
  }
  for (const entry of items(fields.disallowedTools).filter((e) => e.includes('('))) {
    found.push(
      warning('disallowed-specifier', 'A7', at('disallowedTools'), `"${entry}" removes the whole tool, not one command`)
    );
  }
  if ('memory' in fields && 'tools' in fields && !tools.includes('Write') && !tools.includes('Edit')) {
    found.push(warning('memory-tools', 'A7', at('memory'), 'memory adds file tools but tools lacks Write and Edit'));
  }
  return found;
}

// B1, B2, B4 on the body after the frontmatter; `bodyStart` is the closing `---` line number (a 0-based line index).
export function checkBody(content, bodyStart = 0) {
  const lines = content.split('\n');
  const found = [];
  const headings = [];
  let fence = false;
  let first = null;
  for (let i = bodyStart; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^\s*```/.test(line)) {
      fence = !fence;
      if (first === null) first = { line: i + 1, text: line };
      continue;
    }
    if (fence) continue;
    if (first === null && line.trim() !== '') first = { line: i + 1, text: line };
    const m = /^##\s+(.+?)\s*$/.exec(line);
    if (m) headings.push({ name: m[1], index: i });
  }
  if (!first) {
    found.push(error('role-missing', 'B1', bodyStart + 1, 'the body is empty'));
  } else if (/^\s*(#|[-*]\s|\d+\.\s|>|\||```)/.test(first.text)) {
    found.push(error('role-missing', 'B1', first.line, 'the body must open with a one-line role in prose'));
  }
  const task = headings.find((h) => /^Task$/i.test(h.name));
  const ret = headings.find((h) => /^Return$/i.test(h.name));
  if (!task) {
    found.push(error('task-missing', 'B2', bodyStart + 1, 'no "## Task" section'));
  } else {
    const next = headings.find((h) => h.index > task.index);
    const section = lines.slice(task.index + 1, next ? next.index : lines.length);
    if (!section.some((l) => /^\s*\d+\.\s/.test(l))) {
      found.push(error('task-steps', 'B2', task.index + 1, '"## Task" has no numbered list'));
    }
  }
  if (!ret) found.push(error('return-missing', 'B4', bodyStart + 1, 'no "## Return" section'));
  else if (task && ret.index < task.index) {
    found.push(error('return-order', 'B4', ret.index + 1, '"## Return" must come after "## Task"'));
  }
  return found;
}

// Runs every check on one agent file.
export function checkAgent(file, { scope } = {}, deps = defaults) {
  const content = deps.read(file);
  const found = [];
  try {
    const { fields, lineOf, endLine } = parseFrontmatter(content);
    found.push(...checkFrontmatter(fields, basename(file).replace(/\.md$/, ''), lineOf, scope));
    found.push(...checkBody(content, endLine));
  } catch (err) {
    if (!(err instanceof FrontmatterError)) throw err;
    found.push(error('frontmatter-malformed', 'A1', 1, err.message));
  }
  const strip = (f) => ({ id: f.id, rubric: f.rubric, file: basename(file), line: f.line, message: f.message });
  const errors = found.filter((f) => f.level === 'error').map(strip);
  const warnings = found.filter((f) => f.level === 'warning').map(strip);
  return { ok: errors.length === 0, errors, warnings };
}

// Parses argv into { file, scope } or { usage: true } on bad input.
export function parseArgs(argv) {
  const rest = [];
  let scope;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--scope') {
      scope = argv[i + 1];
      i += 1;
      if (!SCOPES.includes(scope)) return { usage: true };
    } else rest.push(argv[i]);
  }
  return rest.length === 1 ? { file: rest[0], scope } : { usage: true };
}

// Returns the exit code: 0 ok, 1 errors, 2 bad usage.
export function main(argv, deps = defaults) {
  const args = parseArgs(argv);
  if (args.usage) {
    deps.error(USAGE);
    return 2;
  }
  let result;
  try {
    result = checkAgent(args.file, { scope: args.scope }, deps);
  } catch (err) {
    if (err?.code !== 'ENOENT') throw err;
    deps.error(`check-agent: ${args.file} not found`);
    return 2;
  }
  deps.log(JSON.stringify(result, null, 2));
  return result.ok ? 0 : 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (err) {
    console.error(`check-agent: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 1;
  }
}
