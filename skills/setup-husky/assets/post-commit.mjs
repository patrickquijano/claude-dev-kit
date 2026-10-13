// Reports whether HEAD carries a valid signature; never fails the commit.
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const defaults = {
  spawn: spawnSync,
  log: (line) => console.log(line)
};

// Runs git and returns the spawn result.
function git(args, deps) {
  return deps.spawn('git', args, { encoding: 'utf8', timeout: 30_000 });
}

// Prints the signature status of HEAD; returns the exit code, always 0.
export function main(deps = defaults) {
  const subject = (git(['log', '-1', '--format=%s'], deps).stdout ?? '').trim();
  const verify = git(['verify-commit', 'HEAD'], deps);

  if (verify.status === 0) {
    deps.log(`✅ Signed: "${subject}"`);
  } else {
    deps.log(`❌ Signed: "${subject}"`);
    const reason = (verify.stderr || verify.error?.message || '').trim() || 'commit has no signature';
    deps.log(reason.replace(/^/gm, '   '));
  }
  return 0;
}

// The one error boundary: an unexpected error prints one stderr line and exits 1 (the commit already happened).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(
      `cdk post-commit: ${String(error?.message ?? error)
        .split('\n')[0]
        .slice(0, 300)}`
    );
    process.exitCode = 1;
  }
}
