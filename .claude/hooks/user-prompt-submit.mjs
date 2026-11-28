// UserPromptSubmit hook: clears the reload marker when the user types the reload command it asks for (`/reload-plugins`, or `/reload-skills` for its own entries); every other prompt passes through.
import { readJsonStdin, runIfMain } from '../../hooks/scripts/lib/hook-io.mjs';
import { clearMarker, markerPath } from './lib/reload-marker.mjs';

const RELOAD = /^\s*(\/reload-(?:plugins|skills))(?:\s|$)/;

const defaults = { readJsonStdin };

// Returns the reload command a prompt types, else null.
export function typedReload(prompt) {
  return typeof prompt === 'string' ? (RELOAD.exec(prompt)?.[1] ?? null) : null;
}

// Returns the exit code: always 0; a failure bubbles to the boundary, which exits 1.
export async function main(deps = defaults) {
  const event = await deps.readJsonStdin();
  const command = typedReload(event.prompt);
  if (command) clearMarker(markerPath(event.session_id, deps.tmp), command, deps.marker);
  return 0;
}

await runIfMain(import.meta.url, main, { label: 'user-prompt-submit (reload gate)' });
