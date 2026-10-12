// Shared Graphify helpers for the SessionStart and Stop hooks; cross-platform, no shell.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

// Side effects as a swappable bundle so tests never touch the fs, PATH, or a child process.
export const realDeps = {
  proc: spawnSync,
  existsSync,
  readFileSync,
  statSync,
  env: process.env,
  platform: process.platform
};
export const OUT_FILES = ['graph.html', 'GRAPH_REPORT.md', 'graph.json'];

// Resolves an executable on PATH (honors PATHEXT on Windows); null when missing.
export function which(name, deps = realDeps) {
  const win = deps.platform === 'win32';
  const exts = win ? (deps.env.PATHEXT || '.EXE;.CMD;.BAT').split(';').filter(Boolean) : [''];
  for (const dir of (deps.env.PATH || '').split(path.delimiter).filter(Boolean)) {
    for (const ext of exts) {
      const full = path.join(dir, name + ext);
      try {
        if (deps.statSync(full).isFile() && (win || deps.statSync(full).mode & 0o111)) return full;
      } catch {
        // Not here.
      }
    }
  }
  return null;
}

// Installed (`graphify` on PATH) and set up (rules file or a `## graphify` heading in the root CLAUDE.md).
export function graphifyConfigured(cwd, deps = realDeps) {
  if (!which('graphify', deps)) return false;
  if (deps.existsSync(path.join(cwd, '.claude', 'rules', 'graphify.md'))) return true;
  try {
    return /^##\s+graphify\s*$/im.test(deps.readFileSync(path.join(cwd, 'CLAUDE.md'), 'utf8'));
  } catch {
    return false;
  }
}

export const graphifyFilesExist = (cwd, deps = realDeps) =>
  OUT_FILES.every((f) => deps.existsSync(path.join(cwd, 'graphify-out', f)));

// Runs `graphify <args>` without a shell (.cmd/.bat shims go through cmd.exe with an argument array).
export function runGraphify(args, cwd, timeout, deps = realDeps) {
  const win = deps.platform === 'win32';
  const bin = which('graphify', deps);
  if (!bin) return { status: null, error: new Error('graphify not found') };
  const opts = { cwd, timeout, encoding: 'utf8', windowsHide: true, env: { ...deps.env, NO_COLOR: '1' } };
  if (win && /\.(cmd|bat)$/i.test(bin)) {
    return deps.proc(deps.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', bin, ...args], opts);
  }
  return deps.proc(bin, args, opts);
}
