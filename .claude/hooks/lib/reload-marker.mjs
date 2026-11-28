// Reload marker shared by the project hooks: a temp file per session listing edited files that need a manual reload command.
// No usable `session_id` means no marker and so no gate.
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expected } from '../../../hooks/scripts/lib/hook-io.mjs';

export const RELOAD_PLUGINS = '/reload-plugins';

const defaults = {
  tmp: tmpdir(),
  readFile: (path) => readFileSync(path, 'utf8'),
  writeFile: writeFileSync,
  remove: rmSync
};

// Marker path for a session; null when the id is missing or not made of `[A-Za-z0-9_-]`, so it cannot escape the temp dir.
export function markerPath(sessionId, tmp = defaults.tmp) {
  if (typeof sessionId !== 'string' || !/^[\w-]{1,128}$/.test(sessionId)) return null;
  return join(tmp, `cdk-reload-${sessionId}.json`);
}

// Pending entries (`{ file, command }`) of a marker; empty when the marker does not exist.
export function readMarker(path, deps = defaults) {
  if (!path) return [];
  try {
    const entries = JSON.parse(deps.readFile(path));
    if (!Array.isArray(entries)) throw new TypeError(`reload marker ${path} is not a JSON array`);
    return entries;
  } catch (err) {
    if (!expected(err, 'ENOENT')) throw err;
    return [];
  }
}

// Adds an entry, replacing an earlier one for the same file and command; does nothing without a path.
export function writeMarker(path, entry, deps = defaults) {
  if (!path) return;
  const kept = readMarker(path, deps).filter((e) => e.file !== entry.file || e.command !== entry.command);
  deps.writeFile(path, JSON.stringify([...kept, entry]));
}

// Drops the entries a typed command resolves: `/reload-plugins` reloads skills too, so it clears them all; any other command clears its own.
export function clearMarker(path, command, deps = defaults) {
  if (!path) return;
  const entries = readMarker(path, deps);
  const left = command === RELOAD_PLUGINS ? [] : entries.filter((e) => e.command !== command);
  if (left.length === 0) deps.remove(path, { force: true });
  else deps.writeFile(path, JSON.stringify(left));
}
