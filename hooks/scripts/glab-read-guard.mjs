// PreToolUse hook: deny `glab api -X GET …` commands that also carry a write method or body fields.
// Skills pre-approve `glab api -X GET …` reads; a later `-X PUT` or field flag would turn the read into an unprompted write.
import { readStdin } from './tools.mjs';

const METHOD = /(?:^|\s)(?:-X\s*|--method(?:=|\s+))["']?([A-Za-z]+)/g;
const FIELD = /(?:^|\s)(?:-[fF]|--field|--raw-field|--input)(?:[=\s]|$)/;

function unsafeSegment(command) {
  for (const segment of command.split(/&&|\|\||[;|\n]/)) {
    const s = segment.trim();
    if (!/^glab\s+api(\s|$)/.test(s)) continue;
    const methods = [...s.matchAll(METHOD)].map((m) => m[1].toUpperCase());
    if (!methods.includes('GET')) continue;
    if (methods.some((m) => m !== 'GET') || FIELD.test(s)) return s;
  }
  return null;
}

async function main() {
  let input;
  try {
    input = JSON.parse(await readStdin());
  } catch {
    return;
  }
  const command = input?.tool_input?.command;
  if (typeof command !== 'string') return;
  const bad = unsafeSegment(command);
  if (!bad) return;
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `cdk glab-read-guard: a \`glab api -X GET\` read must not also set another method or body fields (-f/-F/--field/--raw-field/--input). Run the write as its own command without the GET prefix so it gets a permission prompt. Blocked: ${bad.slice(0, 200)}`
      }
    })
  );
}

main();
