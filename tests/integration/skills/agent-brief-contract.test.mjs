import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const read = (path) => readFileSync(path, 'utf8');

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? walk(join(dir, e.name))
      : e.name.endsWith('.md') && e.name !== 'evals.md'
        ? [join(dir, e.name)]
        : []
  );

// An agent declares kinds (or modes) in Task step 1: "`kind` (`a`, `b`, or `c`)".
const loadAgents = () => {
  const agents = new Map();
  for (const file of readdirSync(join(root, 'agents')).filter((f) => f.endsWith('.md'))) {
    const text = read(join(root, 'agents', file));
    const m = text.match(/^1\. .*?`(?:kind|mode)` \(([^)]*)\)/m);
    if (!m) continue;
    const kinds = [...m[1].matchAll(/`([a-z][a-z-]*)`/g)].map((k) => k[1]);
    const section = text.match(/^## (?:Kinds|Modes)\n([\s\S]*?)(?=^## )/m)?.[1] ?? '';
    const headings = [...section.matchAll(/^### (.+)$/gm)].map((h) => h[1].trim());
    agents.set(file.replace(/\.md$/, ''), { kinds, headings, section });
  }
  return agents;
};

// Keywords a brief must carry per kind, from each kind's "Required inputs" under `## Kinds` or `## Modes`.
const area = [/diff/, /head/, /conventions/, /batch/];
const requiredInputs = {
  'change-verifier': {
    checks: [/root/, /changed/, /documented commands|instruction summary/],
    goals: [/root/, /goals/, /changed/]
  },
  'code-reviewer': {
    intent: [...area, /description/, /issues/],
    correctness: area,
    security: area,
    quality: area,
    sweep: [...area, /findings/],
    threads: [/threads? file|threads\.md/, /thread ids?/, /head/, /state definitions|## states/]
  },
  'codebase-explorer': {
    locate: [/root/, /requirement|target/],
    leftovers: [/root/, /changed/, /identifiers/],
    hypothesis: [/root/, /symptom/, /hypothesis/, /suspect/],
    facts: [/root/, /facts/],
    triage: [/root/, /finding id/, /scanner evidence/]
  },
  'practices-reviewer': {
    dockerfile: [/dockerfile/, /\.dockerignore/, /build context/],
    compose: [/compose/, /target/]
  },
  'repo-analyzer': {
    devcontainer: [/root/],
    gitignore: [/root/, /signals/],
    readme: [/root/],
    instructions: [/root/]
  },
  'rubric-scorer': {
    'skill-checklist': [/rubric/, /target/, /report/],
    'subagent-checklist': [/rubric/, /target/, /report/],
    readme: [/readme/, /rubric/, /archetype/, /facts/, /omitted/],
    'project-instructions': [/rubric/, /principles/, /file paths/, /facts/, /omitted/]
  },
  'security-reviewer': {
    recon: [/root/, /scope\.json/],
    hunt: [/root/, /ledger unit/],
    verify: [/root/, /candidate/]
  },
  'version-resolver': {
    dependencies: [/project path/, /package manager/, /managers\.md/],
    images: [/procedure|practices/, /images/],
    packages: [/root/, /packages/]
  },
  'format-lint-analyzer': { detect: [/root/], check: [/root/, /tools/] },
  'change-analyzer': {
    'branch-name': [/root/, /mode=branch-name/, /base=/],
    group: [/root/, /mode=group/]
  }
};

const SITE = /[Ss]pawn[^\n]*?`cdk:([a-z-]+)`/g;
const TOKENS = [/\b(?:kind|mode)\s+`([^`]+)`/g, /`(?:kind|mode): ([a-z][a-z-]*)`/g, /`mode=([a-z][a-z-]*)/g];
const POINTER = /brief[^.\n]*`[^`]*\.md`|\(Spawn briefs|same shape/i;
const NEAR = 12;
const REGION = 14;

// Spawn sites and kind tokens of every skill markdown file (evals.md excluded).
const parseSkills = (agents) => {
  const sites = [];
  const tokens = [];
  for (const file of walk(join(root, 'skills'))) {
    const rel = relative(root, file);
    const skill = rel.split('/')[1];
    const lines = read(file).split('\n');
    lines.forEach((line, i) => {
      for (const m of line.matchAll(SITE)) sites.push({ rel, skill, line: i + 1, agent: m[1] });
    });
    const briefFile = lines.some((l) => /^#+ .*brief/i.test(l));
    const fileSites = sites.filter((s) => s.rel === rel);
    lines.forEach((line, i) => {
      for (const [form, re] of TOKENS.entries()) {
        for (const m of line.matchAll(re)) {
          const values = m[1].split(/[|,]|\bor\b/).map((v) => v.trim().replace(/^<|>$/g, ''));
          const near = fileSites.filter((s) => s.line <= i + 1 && i + 1 - s.line <= NEAR).at(-1);
          // Prose such as "kind `x`" counts only beside a spawn site; the backticked `kind: x` forms also count in a file with a brief heading.
          if (form === 0 && !near) continue;
          if (!near && !briefFile) continue;
          tokens.push({ rel, skill, line: i + 1, values, near, pointer: POINTER.test(line) });
        }
      }
    });
  }
  const skillAgents = (skill) =>
    new Set(sites.filter((s) => s.skill === skill && agents.has(s.agent)).map((s) => s.agent));
  return { sites, tokens, skillAgents };
};

const matches = (re, line) => {
  re.lastIndex = 0;
  return re.test(line);
};

// Text of the brief after a token: up to REGION lines, stopping at a heading, another spawn site, or another token line.
const regionOf = (token) => {
  const lines = read(join(root, token.rel)).split('\n');
  const out = [lines[token.line - 1]];
  for (const l of lines.slice(token.line, token.line + REGION)) {
    if (/^#/.test(l) || matches(SITE, l) || TOKENS.some((re) => matches(re, l))) break;
    out.push(l);
  }
  let text = out.join('\n');
  for (const ref of text.matchAll(/`## ([^`]+)`/g)) {
    const at = lines.findIndex((l) => l === `## ${ref[1]}`);
    if (at >= 0) text += '\n' + lines.slice(at + 1, at + 1 + REGION).join('\n');
  }
  return text.toLowerCase();
};

const agents = loadAgents();
const { sites, tokens, skillAgents } = parseSkills(agents);

// Resolve each token to the agent it briefs: the nearest preceding spawn site, else the skill's kinded agents.
const resolve = (token) => {
  if (token.near && agents.has(token.near.agent)) return [token.near.agent];
  return [...skillAgents(token.skill)];
};

describe('cdk agent briefs in skills match each agent declared inputs', () => {
  test('the parser finds spawns and kind tokens for every agent that declares kinds', () => {
    // Arrange
    const kinded = [...agents.keys()];
    // Act
    const missing = kinded.filter(
      (a) => !sites.some((s) => s.agent === a) || !tokens.some((t) => resolve(t).includes(a))
    );
    // Assert
    assert.ok(kinded.length >= 9, `only ${kinded.length} agents declare kinds`);
    assert.deepEqual(missing, []);
  });

  test('each agent kind section has a table entry here and a Required inputs line', () => {
    // Arrange
    const problems = [];
    // Act
    for (const [name, { kinds, headings, section }] of agents) {
      const table = requiredInputs[name] ?? {};
      for (const h of headings) {
        if (!(h in table)) problems.push(`${name}: no keyword entry for kind ${h}`);
        if (!kinds.includes(h)) problems.push(`${name}: kind ${h} not in Task step 1`);
      }
      for (const k of Object.keys(table)) {
        if (!kinds.includes(k)) problems.push(`${name}: table kind ${k} not declared`);
      }
      if (headings.length > 0 && !/Required inputs/.test(section)) problems.push(`${name}: no Required inputs`);
    }
    // Assert
    assert.deepEqual(problems, []);
  });

  test('every kind named in a skill is declared by the agent it briefs', () => {
    // Arrange
    const bad = [];
    // Act
    for (const t of tokens) {
      const owners = resolve(t);
      for (const v of t.values) {
        if (v === 'kind' || owners.length === 0) continue;
        if (!owners.some((a) => agents.get(a).kinds.includes(v)))
          bad.push(`${t.rel}:${t.line} ${owners.join('|')} kind ${v}`);
      }
    }
    // Assert
    assert.deepEqual(bad, []);
  });

  test('every brief supplies the required inputs of its kind', () => {
    // Arrange
    const bad = [];
    // Act
    for (const t of tokens) {
      if (t.pointer) continue;
      const [agent] = resolve(t);
      const table = requiredInputs[agent];
      if (!table) continue;
      const text = regionOf(t);
      for (const v of t.values) {
        const patterns = table[v] ?? (v === 'kind' && agent === 'code-reviewer' ? area : undefined);
        if (!patterns) continue;
        const absent = patterns.filter((re) => !re.test(text)).map((re) => re.source);
        if (absent.length > 0) bad.push(`${t.rel}:${t.line} ${agent} kind ${v} lacks ${absent.join(', ')}`);
      }
    }
    // Assert
    assert.deepEqual(bad, []);
  });
});
