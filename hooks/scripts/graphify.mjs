// Shared Graphify helpers for the SessionStart and Stop hooks; cross-platform, no shell.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const win = process.platform === 'win32';
export const OUT_FILES = ['graph.html', 'GRAPH_REPORT.md', 'graph.json'];

// Resolves an executable on PATH (honors PATHEXT on Windows); null when missing.
export function which(name) {
  const exts = win ? (process.env.PATHEXT || '.EXE;.CMD;.BAT').split(';').filter(Boolean) : [''];
  for (const dir of (process.env.PATH || '').split(path.delimiter).filter(Boolean)) {
    for (const ext of exts) {
      const full = path.join(dir, name + ext);
      try {
        if (statSync(full).isFile() && (win || statSync(full).mode & 0o111)) return full;
      } catch {
        // Not here.
      }
    }
  }
  return null;
}

// Installed (`graphify` on PATH) and set up (rules file or a `## graphify` heading in the root CLAUDE.md).
export function graphifyConfigured(cwd) {
  if (!which('graphify')) return false;
  if (existsSync(path.join(cwd, '.claude', 'rules', 'graphify.md'))) return true;
  try {
    return /^##\s+graphify\s*$/im.test(readFileSync(path.join(cwd, 'CLAUDE.md'), 'utf8'));
  } catch {
    return false;
  }
}

export const graphifyFilesExist = (cwd) => OUT_FILES.every((f) => existsSync(path.join(cwd, 'graphify-out', f)));

// Runs `graphify <args>` without a shell (.cmd/.bat shims go through cmd.exe with an argument array).
export function runGraphify(args, cwd, timeout) {
  const bin = which('graphify');
  if (!bin) return { status: null, error: new Error('graphify not found') };
  const opts = { cwd, timeout, encoding: 'utf8', windowsHide: true, env: { ...process.env, NO_COLOR: '1' } };
  if (win && /\.(cmd|bat)$/i.test(bin)) {
    return spawnSync(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', bin, ...args], opts);
  }
  return spawnSync(bin, args, opts);
}
