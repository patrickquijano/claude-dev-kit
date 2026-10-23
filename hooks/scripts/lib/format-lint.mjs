// PostToolUse hook: format and lint the file Claude just wrote or edited.
// Prints one JSON object; failures return the tool output as additionalContext so Claude can fix them.
import { readFileSync, realpathSync, renameSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { contextOutput, projectDir as resolveProjectDir } from './hook-io.mjs';
import {
  TABLE,
  WIN_UNSAFE,
  available,
  failureText,
  isFile,
  keyOf,
  resolveStep,
  run,
  stepCommand,
  win,
  writeStdout
} from './tools.mjs';

const REAL_DEPS = {
  isFile,
  available,
  run,
  win,
  readFile: (f) => readFileSync(f, 'utf8'),
  realpath: realpathSync,
  writeFile: writeFileSync,
  rename: renameSync,
  env: process.env,
  cwd: () => process.cwd(),
  pid: process.pid
};

// Returns the hook result object, or null when there is nothing to report. `deps` overrides side effects.
export function formatLint(input, deps = {}) {
  const d = { ...REAL_DEPS, ...deps };
  const file = input?.tool_input?.file_path;
  if (typeof file !== 'string' || !d.isFile(file) || (d.win && WIN_UNSAFE.test(file))) return null;
  const projectDir = resolveProjectDir(input, d);
  const abs = d.realpath(file);
  const rel = path.relative(projectDir, abs);
  const segments = rel.split(/[\\/]/);
  if (!rel || path.isAbsolute(rel) || segments[0] === '..') return null;
  if (segments.some((s) => s === 'node_modules' || s === '.git')) return null;

  const key = keyOf(abs);
  const target = rel.split(path.sep).join('/');
  const lines = [];
  const failures = [];
  for (const entry of TABLE[key] || []) {
    const step = resolveStep(entry, projectDir, d);
    if (!step || step.skip?.(d.readFile(abs))) continue;
    const [cmd, argv] = stepCommand(step, [target]);
    const before = d.readFile(abs);
    const r = d.run(cmd, argv, projectDir);
    const ok = !r.error && r.status === 0;
    if (ok && step.stdout) writeStdout(abs, r.stdout, d);
    // Report only a failure or a step that changed the file.
    if (!ok || d.readFile(abs) !== before) lines.push(`${ok ? '✅' : '❌'} ${entry.kind}: ${target}`);
    if (!ok) failures.push(failureText(cmd, argv, r, step));
    // A failed formatter leaves stale content, so its linter would report on the wrong text.
    if (!ok && entry.kind === 'Format') break;
  }
  if (!lines.length) return null;
  const message = lines.join(' | ');
  return failures.length
    ? contextOutput('PostToolUse', `Format/lint issues in ${target}; fix these issues:\n${failures.join('\n\n')}`, {
        systemMessage: message
      })
    : { systemMessage: message };
}
