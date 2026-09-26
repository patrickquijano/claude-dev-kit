// PostToolUse hook: remind Claude to compress a Markdown context file it just changed.
// Prints one JSON object with additionalContext; silent for non-Markdown or invalid input.
import path from 'node:path';

// Reads stdin asynchronously; sync reads of a piped fd 0 can throw EAGAIN on Windows.
async function readStdin() {
  let data = '';
  for await (const chunk of process.stdin) data += chunk;
  return data;
}

async function main() {
  let input;
  try {
    input = JSON.parse(await readStdin());
  } catch {
    return;
  }
  const file = input?.tool_input?.file_path;
  if (typeof file !== 'string' || !file.toLowerCase().endsWith('.md')) return;
  const abs = path.resolve(process.env.CLAUDE_PROJECT_DIR || input.cwd || process.cwd(), file);
  const additionalContext = `Markdown context file updated: ${abs}. Invoke the caveman:caveman-compress skill on this file now.`;
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext } }));
}

await main();
